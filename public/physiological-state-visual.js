// =============================================
// AI Companion — 虚拟生理状态可视化系统
// =============================================
// 状态图表、变化动画、智能恢复建议
// =============================================

const PhysiologicalStateVisual = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    version: '1.0',
    updateInterval: 5000,      // 更新间隔（毫秒）
    chartHistoryLength: 20,    // 图表历史长度
    animationDuration: 800,    // 动画时长（毫秒）
  };

  // ==================== 状态管理 ====================
  let isInitialized = false;
  let updateTimer = null;
  let chartHistory = {
    energy: [],
    stress: [],
    mood: [],
    socialBattery: [],
    timestamps: [],
  };

  // DOM 元素引用
  let elements = {
    panel: null,
    energyBar: null,
    stressBar: null,
    moodBar: null,
    socialBatteryBar: null,
    energyValue: null,
    stressValue: null,
    moodValue: null,
    socialBatteryValue: null,
    energyLabel: null,
    stressLabel: null,
    moodLabel: null,
    socialBatteryLabel: null,
    awakeDuration: null,
    stateDescription: null,
    suggestions: null,
    chartCanvas: null,
    radarCanvas: null,
  };

  // ==================== 初始化 ====================
  function init() {
    if (isInitialized) {
      console.log('[PhysioVisual] 已经初始化过了');
      return;
    }

    // 查找 DOM 元素
    cacheElements();

    // 初始化图表
    initCharts();

    // 启动定时更新
    startAutoUpdate();

    // 监听状态变化事件
    window.addEventListener('physiological-state-updated', handleStateUpdate);

    isInitialized = true;
    console.log('[PhysioVisual] 虚拟生理状态可视化系统已初始化');

    // 立即更新一次
    update();
  }

  /**
   * 缓存 DOM 元素引用
   */
  function cacheElements() {
    elements.panel = document.getElementById('physiological-panel');
    elements.energyBar = document.getElementById('physio-energy-bar');
    elements.stressBar = document.getElementById('physio-stress-bar');
    elements.moodBar = document.getElementById('physio-mood-bar');
    elements.socialBatteryBar = document.getElementById('physio-socialbattery-bar');
    elements.energyValue = document.getElementById('physio-energy-value');
    elements.stressValue = document.getElementById('physio-stress-value');
    elements.moodValue = document.getElementById('physio-mood-value');
    elements.socialBatteryValue = document.getElementById('physio-socialbattery-value');
    elements.energyLabel = document.getElementById('physio-energy-label');
    elements.stressLabel = document.getElementById('physio-stress-label');
    elements.moodLabel = document.getElementById('physio-mood-label');
    elements.socialBatteryLabel = document.getElementById('physio-socialbattery-label');
    elements.awakeDuration = document.getElementById('physio-awake-duration');
    elements.stateDescription = document.getElementById('physio-state-description');
    elements.suggestions = document.getElementById('physio-suggestions');
    elements.chartCanvas = document.getElementById('physio-chart-canvas');
    elements.radarCanvas = document.getElementById('physio-radar-canvas');
  }

  /**
   * 初始化图表
   */
  function initCharts() {
    // 折线图初始化
    if (elements.chartCanvas) {
      const ctx = elements.chartCanvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, elements.chartCanvas.width, elements.chartCanvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待数据...', elements.chartCanvas.width / 2, elements.chartCanvas.height / 2);
    }

    // 雷达图初始化
    if (elements.radarCanvas) {
      const ctx = elements.radarCanvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, elements.radarCanvas.width, elements.radarCanvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待数据...', elements.radarCanvas.width / 2, elements.radarCanvas.height / 2);
    }
  }

  // ==================== 更新逻辑 ====================
  
  /**
   * 启动自动更新
   */
  function startAutoUpdate() {
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(update, CONFIG.updateInterval);
  }

  /**
   * 停止自动更新
   */
  function stopAutoUpdate() {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  }

  /**
   * 主更新函数
   */
  function update() {
    if (typeof PhysiologicalStateSystem === 'undefined') {
      console.warn('[PhysioVisual] PhysiologicalStateSystem 未加载');
      return;
    }

    const state = PhysiologicalStateSystem.getState();
    if (!state) {
      console.warn('[PhysioVisual] 无法获取状态');
      return;
    }

    // 更新进度条和数值
    updateBars(state);

    // 更新标签和颜色
    updateLabels(state);

    // 更新清醒时长
    updateAwakeDuration(state);

    // 更新状态描述
    updateStateDescription(state);

    // 更新建议
    updateSuggestions(state);

    // 更新图表
    updateCharts(state);
  }

  /**
   * 更新进度条
   */
  function updateBars(state) {
    animateBar(elements.energyBar, state.energy);
    animateBar(elements.stressBar, state.stress);
    animateBar(elements.moodBar, state.mood);
    animateBar(elements.socialBatteryBar, state.socialBattery);

    if (elements.energyValue) elements.energyValue.textContent = Math.round(state.energy);
    if (elements.stressValue) elements.stressValue.textContent = Math.round(state.stress);
    if (elements.moodValue) elements.moodValue.textContent = Math.round(state.mood);
    if (elements.socialBatteryValue) elements.socialBatteryValue.textContent = Math.round(state.socialBattery);
  }

  /**
   * 动画更新进度条
   */
  function animateBar(barElement, targetValue) {
    if (!barElement) return;

    const currentWidth = parseFloat(barElement.style.width) || 0;
    const targetWidth = Math.max(0, Math.min(100, targetValue));

    // 使用 CSS transition
    barElement.style.transition = `width ${CONFIG.animationDuration}ms ease-out`;
    barElement.style.width = targetWidth + '%';
  }

  /**
   * 更新标签和颜色
   */
  function updateLabels(state) {
    // 精力
    const energyInfo = getEnergyInfo(state.energy);
    if (elements.energyLabel) elements.energyLabel.textContent = energyInfo.label;
    if (elements.energyBar) elements.energyBar.style.backgroundColor = energyInfo.color;

    // 压力
    const stressInfo = getStressInfo(state.stress);
    if (elements.stressLabel) elements.stressLabel.textContent = stressInfo.label;
    if (elements.stressBar) elements.stressBar.style.backgroundColor = stressInfo.color;

    // 心情
    const moodInfo = getMoodInfo(state.mood);
    if (elements.moodLabel) {
      elements.moodLabel.textContent = moodInfo.label + ' ' + moodInfo.emoji;
    }
    if (elements.moodBar) elements.moodBar.style.backgroundColor = moodInfo.color;

    // 社交电量
    const socialInfo = getSocialBatteryInfo(state.socialBattery);
    if (elements.socialBatteryLabel) elements.socialBatteryLabel.textContent = socialInfo.label;
    if (elements.socialBatteryBar) elements.socialBatteryBar.style.backgroundColor = socialInfo.color;
  }

  /**
   * 更新清醒时长
   */
  function updateAwakeDuration(state) {
    if (!elements.awakeDuration) return;

    const hours = state.awakeDuration || 0;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    let text = `${h} 小时 ${m} 分钟`;
    let className = '';

    if (hours > 20) {
      className = 'warning-critical';
      text += ' ⚠️';
    } else if (hours > 16) {
      className = 'warning';
      text += ' ⚠';
    }

    elements.awakeDuration.textContent = text;
    elements.awakeDuration.className = className;
  }

  /**
   * 更新状态描述
   */
  function updateStateDescription(state) {
    if (!elements.stateDescription) return;

    const description = PhysiologicalStateSystem.generateStatusDescription();
    elements.stateDescription.textContent = description;
  }

  /**
   * 更新建议
   */
  function updateSuggestions(state) {
    if (!elements.suggestions) return;

    const suggestions = PhysiologicalStateSystem.generateRestSuggestion();
    
    if (suggestions.length === 0) {
      elements.suggestions.innerHTML = '<div class="suggestion-item">✅ 状态良好，无需特别建议</div>';
      return;
    }

    const html = suggestions.map(s => {
      const icon = s.type === 'urgent' ? '🔴' : '🟡';
      const className = s.type === 'urgent' ? 'suggestion-urgent' : 'suggestion-normal';
      return `<div class="suggestion-item ${className}">${icon} ${s.message}</div>`;
    }).join('');

    elements.suggestions.innerHTML = html;
  }

  /**
   * 更新图表
   */
  function updateCharts(state) {
    // 添加到历史
    chartHistory.energy.push(state.energy);
    chartHistory.stress.push(state.stress);
    chartHistory.mood.push(state.mood);
    chartHistory.socialBattery.push(state.socialBattery);
    chartHistory.timestamps.push(Date.now());

    // 限制历史长度
    if (chartHistory.energy.length > CONFIG.chartHistoryLength) {
      chartHistory.energy.shift();
      chartHistory.stress.shift();
      chartHistory.mood.shift();
      chartHistory.socialBattery.shift();
      chartHistory.timestamps.shift();
    }

    // 绘制折线图
    drawLineChart();

    // 绘制雷达图
    drawRadarChart(state);
  }

  /**
   * 绘制折线图
   */
  function drawLineChart() {
    if (!elements.chartCanvas) return;

    const canvas = elements.chartCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // 清空画布
    ctx.fillStyle = 'rgba(15, 15, 26, 0.95)';
    ctx.fillRect(0, 0, width, height);

    if (chartHistory.energy.length < 2) return;

    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    const dataLength = chartHistory.energy.length;
    const xStep = drawWidth / (dataLength - 1);

    // 绘制网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (drawHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Y 轴标签
      ctx.fillStyle = '#8888a0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((100 - i * 25) + '', padding - 10, y + 4);
    }

    // 绘制折线
    const lines = [
      { data: chartHistory.energy, color: '#4caf50', label: '精力' },
      { data: chartHistory.stress, color: '#f44336', label: '压力' },
      { data: chartHistory.mood, color: '#2196f3', label: '心情' },
      { data: chartHistory.socialBattery, color: '#ff9800', label: '社交' },
    ];

    lines.forEach(line => {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      line.data.forEach((value, i) => {
        const x = padding + i * xStep;
        const y = padding + drawHeight - (value / 100) * drawHeight;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    });

    // 绘制图例
    const legendX = width - padding - 60;
    let legendY = padding + 10;
    lines.forEach(line => {
      ctx.fillStyle = line.color;
      ctx.fillRect(legendX, legendY, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(line.label, legendX + 18, legendY + 10);
      legendY += 20;
    });
  }

  /**
   * 绘制雷达图
   */
  function drawRadarChart(state) {
    if (!elements.radarCanvas) return;

    const canvas = elements.radarCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 40;

    // 清空画布
    ctx.fillStyle = 'rgba(15, 15, 26, 0.95)';
    ctx.fillRect(0, 0, width, height);

    // 数据
    const data = [
      { label: '精力', value: state.energy, angle: 0 },
      { label: '心情', value: state.mood, angle: Math.PI / 2 },
      { label: '社交', value: state.socialBattery, angle: Math.PI },
      { label: '压力', value: 100 - state.stress, angle: (Math.PI * 3) / 2 }, // 反转压力（低压力=好）
    ];

    // 绘制背景圆圈
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const radius = (maxRadius / 5) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 绘制轴线和标签
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    data.forEach(item => {
      const x = centerX + Math.cos(item.angle - Math.PI / 2) * maxRadius;
      const y = centerY + Math.sin(item.angle - Math.PI / 2) * maxRadius;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // 标签
      const labelX = centerX + Math.cos(item.angle - Math.PI / 2) * (maxRadius + 20);
      const labelY = centerY + Math.sin(item.angle - Math.PI / 2) * (maxRadius + 20);
      ctx.fillText(item.label, labelX, labelY);
    });

    // 绘制数据区域
    ctx.fillStyle = 'rgba(255, 107, 157, 0.2)';
    ctx.strokeStyle = 'rgba(255, 107, 157, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((item, i) => {
      const radius = (item.value / 100) * maxRadius;
      const x = centerX + Math.cos(item.angle - Math.PI / 2) * radius;
      const y = centerY + Math.sin(item.angle - Math.PI / 2) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 绘制数据点
    ctx.fillStyle = '#ff6b9d';
    data.forEach(item => {
      const radius = (item.value / 100) * maxRadius;
      const x = centerX + Math.cos(item.angle - Math.PI / 2) * radius;
      const y = centerY + Math.sin(item.angle - Math.PI / 2) * radius;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ==================== 事件处理 ====================
  
  /**
   * 处理状态更新事件
   */
  function handleStateUpdate(event) {
    console.log('[PhysioVisual] 收到状态更新事件', event.detail);
    update();
  }

  // ==================== 辅助函数 ====================
  
  function getEnergyInfo(value) {
    if (value > 70) return { label: '精力充沛', color: '#4caf50' };
    if (value > 40) return { label: '正常', color: '#ffc107' };
    if (value > 20) return { label: '疲惫', color: '#ff9800' };
    if (value > 10) return { label: '精疲力竭', color: '#ff5722' };
    return { label: '崩溃边缘', color: '#f44336' };
  }

  function getStressInfo(value) {
    if (value < 30) return { label: '轻松', color: '#4caf50' };
    if (value < 60) return { label: '正常', color: '#ffc107' };
    if (value < 80) return { label: '紧张', color: '#ff9800' };
    return { label: '极度紧张', color: '#f44336' };
  }

  function getMoodInfo(value) {
    if (value > 80) return { label: '很好', emoji: '😊', color: '#4caf50' };
    if (value > 60) return { label: '好', emoji: '🙂', color: '#8bc34a' };
    if (value > 40) return { label: '一般', emoji: '😐', color: '#ffc107' };
    if (value > 20) return { label: '低落', emoji: '😔', color: '#ff9800' };
    return { label: '沮丧', emoji: '😢', color: '#f44336' };
  }

  function getSocialBatteryInfo(value) {
    if (value > 70) return { label: '充足', color: '#4caf50' };
    if (value > 40) return { label: '中等', color: '#ffc107' };
    if (value > 20) return { label: '低', color: '#ff9800' };
    return { label: '耗尽', color: '#f44336' };
  }

  // ==================== 公开接口 ====================
  
  return {
    init,
    update,
    startAutoUpdate,
    stopAutoUpdate,
    version: CONFIG.version,
  };
})();

// 自动初始化
if (typeof window !== 'undefined') {
  window.PhysiologicalStateVisual = PhysiologicalStateVisual;
  console.log('[PhysioVisual] 虚拟生理状态可视化系统已加载 v' + PhysiologicalStateVisual.version);
}
