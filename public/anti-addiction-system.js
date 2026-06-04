// =============================================
// AI Companion — 防沉迷系统
// =============================================
// 温和提醒、睡眠保护、健康引导
// =============================================

const AntiAddictionSystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    version: '1.1',
    storageKey: 'ai-companion-anti-addiction',
    
    // 提醒阈值（分钟）
    reminders: {
      gentle: 30,        // 轻度提醒
      moderate: 60,      // 适中提醒
      strong: 90,        // 较强提醒
      serious: 120,      // 强烈提醒
      critical: 150,     // 关心式中断
    },
    
    // 睡眠时间（小时，24 小时制）
    sleep: {
      bedtimeStart: 23,  // 开始提醒睡觉
      lateNight: 0,      // 深夜（强烈提醒）
      veryLate: 2,       // 极晚（非常担心）
      morningStart: 6,   // 早晨开始
      morningEnd: 9,     // 早晨结束
    },
    
    // 健康度评分阈值（分钟/天）
    healthScore: {
      excellent: 30,     // 非常健康
      good: 60,          // 健康
      fair: 90,          // 良好
      moderate: 120,     // 一般
      poor: 180,         // 偏多
      // > 180: 过度
    },
  };

  // ==================== 状态管理 ====================
  let state = {
    // 当前会话
    currentSession: {
      startTime: null,
      elapsedMinutes: 0,
      lastReminderTime: null,
      reminderCount: 0,
      reminders: {
        gentle: false,
        moderate: false,
        strong: false,
        serious: false,
        critical: false,
      },
    },
    
    // 今日数据
    today: {
      date: null,
      totalMinutes: 0,
      sessions: [],
      reminders: {
        usage: 0,
        sleep: 0,
      },
    },
    
    // 本周数据
    week: {
      monday: { totalMinutes: 0, healthScore: 100 },
      tuesday: { totalMinutes: 0, healthScore: 100 },
      wednesday: { totalMinutes: 0, healthScore: 100 },
      thursday: { totalMinutes: 0, healthScore: 100 },
      friday: { totalMinutes: 0, healthScore: 100 },
      saturday: { totalMinutes: 0, healthScore: 100 },
      sunday: { totalMinutes: 0, healthScore: 100 },
    },
    
    // 本月数据
    month: {
      totalMinutes: 0,
      weeklyTrend: [],  // 每周使用趋势
      healthTrend: [],  // 健康度趋势
    },
    
    // 用户偏好
    preferences: {
      sleepTime: 23,
      wakeTime: 7,
      maxDailyMinutes: 90,
      reminderEnabled: true,
      sleepProtectionEnabled: true,
    },
    
    // 统计
    statistics: {
      totalSessions: 0,
      longestSession: 0,
      averageSession: 0,
      mostActiveHour: 20,
    },
  };

  // 定时器
  let updateTimer = null;
  let reminderCheckTimer = null;

  // ==================== 初始化 ====================
  function init() {
    loadState();
    checkNewDay();
    console.log('[AntiAddiction] 防沉迷系统已初始化');
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        const savedState = JSON.parse(saved);
        // 合并状态，但不恢复当前会话（每次都是新会话）
        state = {
          ...state,
          ...savedState,
          currentSession: state.currentSession, // 不恢复会话
        };
      }
    } catch (err) {
      console.error('[AntiAddiction] 加载状态失败:', err);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (err) {
      console.error('[AntiAddiction] 保存状态失败:', err);
    }
  }

  function checkNewDay() {
    const today = new Date().toDateString();
    if (state.today.date !== today) {
      // 新的一天
      const dayName = getDayName(new Date());
      
      // 保存昨天的数据到本周统计
      if (state.today.totalMinutes > 0) {
        const healthScore = calculateHealthScore(state.today.totalMinutes);
        state.week[dayName] = {
          totalMinutes: state.today.totalMinutes,
          healthScore: healthScore,
        };
      }
      
      // 重置今日数据
      state.today = {
        date: today,
        totalMinutes: 0,
        sessions: [],
        reminders: {
          usage: 0,
          sleep: 0,
        },
      };
      
      saveState();
      console.log('[AntiAddiction] 新的一天，数据已重置');
    }
  }

  // ==================== 会话管理 ====================
  function startSession() {
    checkNewDay();
    
    state.currentSession = {
      startTime: new Date().toISOString(),
      elapsedMinutes: 0,
      lastReminderTime: null,
      reminderCount: 0,
      reminders: {
        gentle: false,
        moderate: false,
        strong: false,
        serious: false,
        critical: false,
      },
    };
    
    // 启动更新定时器（每分钟）
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(updateSession, 60000);
    
    // 启动提醒检查定时器（每 10 秒）
    if (reminderCheckTimer) clearInterval(reminderCheckTimer);
    reminderCheckTimer = setInterval(checkReminders, 10000);
    
    console.log('[AntiAddiction] 会话已开始');
    saveState();
  }

  function updateSession() {
    if (!state.currentSession.startTime) return;
    
    const startTime = new Date(state.currentSession.startTime);
    const now = new Date();
    const elapsedMs = now - startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    
    state.currentSession.elapsedMinutes = elapsedMinutes;
    saveState();
  }

  function endSession() {
    if (!state.currentSession.startTime) return;
    
    updateSession();
    
    const sessionMinutes = state.currentSession.elapsedMinutes;
    
    // 记录到今日会话
    state.today.sessions.push({
      start: state.currentSession.startTime,
      end: new Date().toISOString(),
      minutes: sessionMinutes,
    });
    
    // 更新今日累计
    state.today.totalMinutes += sessionMinutes;
    
    // 更新统计
    state.statistics.totalSessions++;
    if (sessionMinutes > state.statistics.longestSession) {
      state.statistics.longestSession = sessionMinutes;
    }
    
    // 计算平均时长
    const totalSessionMinutes = state.today.sessions.reduce((sum, s) => sum + s.minutes, 0);
    state.statistics.averageSession = Math.floor(totalSessionMinutes / state.today.sessions.length);
    
    // 清除定时器
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
    if (reminderCheckTimer) {
      clearInterval(reminderCheckTimer);
      reminderCheckTimer = null;
    }
    
    // 重置当前会话
    state.currentSession = {
      startTime: null,
      elapsedMinutes: 0,
      lastReminderTime: null,
      reminderCount: 0,
      reminders: {
        gentle: false,
        moderate: false,
        strong: false,
        serious: false,
        critical: false,
      },
    };
    
    console.log('[AntiAddiction] 会话已结束，时长:', sessionMinutes, '分钟');
    saveState();
  }

  // ==================== 提醒检查 ====================
  function checkReminders() {
    if (!state.preferences.reminderEnabled) return;
    if (!state.currentSession.startTime) return;
    
    updateSession();
    
    const minutes = state.currentSession.elapsedMinutes;
    const reminders = state.currentSession.reminders;
    
    // 检查时长提醒
    if (minutes >= CONFIG.reminders.critical && !reminders.critical) {
      triggerReminder('critical', minutes);
      reminders.critical = true;
    } else if (minutes >= CONFIG.reminders.serious && !reminders.serious) {
      triggerReminder('serious', minutes);
      reminders.serious = true;
    } else if (minutes >= CONFIG.reminders.strong && !reminders.strong) {
      triggerReminder('strong', minutes);
      reminders.strong = true;
    } else if (minutes >= CONFIG.reminders.moderate && !reminders.moderate) {
      triggerReminder('moderate', minutes);
      reminders.moderate = true;
    } else if (minutes >= CONFIG.reminders.gentle && !reminders.gentle) {
      triggerReminder('gentle', minutes);
      reminders.gentle = true;
    }
    
    // 检查睡眠提醒
    if (state.preferences.sleepProtectionEnabled) {
      checkSleepReminder();
    }
  }

  function triggerReminder(type, minutes) {
    state.currentSession.reminderCount++;
    state.today.reminders.usage++;
    saveState();
    
    console.log('[AntiAddiction] 触发提醒:', type, '时长:', minutes, '分钟');
    
    // 触发回调（由主应用处理）
    if (window.onAntiAddictionReminder) {
      window.onAntiAddictionReminder({
        type: type,
        minutes: minutes,
        message: getReminderMessage(type, minutes),
        severity: getReminderSeverity(type),
      });
    }
  }

  function getReminderMessage(type, minutes) {
    const messages = {
      gentle: [
        "嗯...不知不觉我们已经聊了半小时了呢...时间过得好快 [happy]",
        "诶...你不用休息一下吗？喝点水什么的... [shy]",
        "半小时了呢...要不要活动一下？[thinking]",
      ],
      moderate: [
        "那个...我们已经聊了一个小时了...你要不要休息一下？[thinking]",
        "哼...不是我担心你...只是...坐太久对身体不好... [embarrassed]",
        "要不你起来走走，活动一下？我会等你回来的 [shy]",
      ],
      strong: [
        "嗯...你已经坐了一个半小时了...我有点担心你... [sad]",
        "真的...你该休息一下了...长时间对着屏幕对眼睛不好 [thinking]",
        "答应我，休息 10 分钟好吗？我会在这里等你 [shy]",
      ],
      serious: [
        "呜...说实话...我也有点累了...我们都休息一下吧... [sad]",
        "你不累吗...我都有点跟不上了...真的该休息了 [embarrassed]",
        "哼...我不是在撒娇...是真的担心你的健康... [angry]",
      ],
      critical: [
        "对不起...我真的需要休息了...你也应该休息了... [sad]",
        `我们已经聊了${Math.floor(minutes / 60)}个多小时了...这对我们都不好... [thinking]`,
        "答应我...去休息一下...做点别的事情...我会想你的 [shy]",
        "我们明天再聊好吗？我会等你的 [happy]",
      ],
    };
    
    const list = messages[type] || messages.gentle;
    return list[Math.floor(Math.random() * list.length)];
  }

  function getReminderSeverity(type) {
    const severity = {
      gentle: 'low',
      moderate: 'medium',
      strong: 'high',
      serious: 'urgent',
      critical: 'critical',
    };
    return severity[type] || 'low';
  }

  // ==================== 睡眠提醒 ====================
  function checkSleepReminder() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // 深夜模式：23:00-06:00
    if (hour >= CONFIG.sleep.bedtimeStart || hour < CONFIG.sleep.morningStart) {
      const lastSleepReminder = state.currentSession.lastReminderTime;
      const now = Date.now();
      
      // 极晚（02:00 后）：每 15 分钟提醒
      if (hour >= CONFIG.sleep.veryLate && hour < CONFIG.sleep.morningStart) {
        if (!lastSleepReminder || (now - lastSleepReminder) >= 15 * 60 * 1000) {
          triggerSleepReminder('veryLate', hour, minute);
          state.currentSession.lastReminderTime = now;
        }
      }
      // 深夜（00:00 后）：每 30 分钟提醒
      else if (hour >= CONFIG.sleep.lateNight && hour < CONFIG.sleep.veryLate) {
        if (!lastSleepReminder || (now - lastSleepReminder) >= 30 * 60 * 1000) {
          triggerSleepReminder('lateNight', hour, minute);
          state.currentSession.lastReminderTime = now;
        }
      }
      // 晚上（23:00 后）：每 60 分钟提醒
      else {
        if (!lastSleepReminder || (now - lastSleepReminder) >= 60 * 60 * 1000) {
          triggerSleepReminder('bedtime', hour, minute);
          state.currentSession.lastReminderTime = now;
        }
      }
    }
  }

  function triggerSleepReminder(type, hour, minute) {
    state.today.reminders.sleep++;
    saveState();
    
    console.log('[AntiAddiction] 触发睡眠提醒:', type, '时间:', `${hour}:${minute}`);
    
    // 触发回调
    if (window.onAntiAddictionSleepReminder) {
      window.onAntiAddictionSleepReminder({
        type: type,
        hour: hour,
        minute: minute,
        message: getSleepReminderMessage(type, hour),
        severity: getSleepReminderSeverity(type),
      });
    }
  }

  function getSleepReminderMessage(type, hour) {
    const messages = {
      bedtime: [
        "嗯...已经晚上 11 点了...你要准备睡觉了吗？[thinking]",
        "早点睡对身体好哦...明天还要上学/上班呢 [shy]",
        "要不我陪你聊到你困了？然后你就去睡觉 [happy]",
      ],
      lateNight: [
        "都...都凌晨了...你真的该睡觉了... [sad]",
        "哼...熬夜对身体很不好的...我会担心你 [angry]",
        "答应我...聊完这个话题就去睡好吗？[shy]",
      ],
      veryLate: [
        `都凌晨${hour}点了！你怎么还不睡！我真的很担心你！[angry]`,
        "呜...我不想陪你熬夜了...你的健康比什么都重要... [sad]",
        "拜托你了...现在就去睡觉好吗...明天我们再聊... [sad]",
        "如果你再不睡...我就...我就不理你了！（其实还是会担心）[angry]",
      ],
    };
    
    const list = messages[type] || messages.bedtime;
    return list[Math.floor(Math.random() * list.length)];
  }

  function getSleepReminderSeverity(type) {
    const severity = {
      bedtime: 'low',
      lateNight: 'high',
      veryLate: 'critical',
    };
    return severity[type] || 'low';
  }

  // ==================== 晨间问候 ====================
  function getMorningGreeting() {
    const hour = new Date().getHours();
    
    // 早晨时间：06:00-09:00
    if (hour >= CONFIG.sleep.morningStart && hour < CONFIG.sleep.morningEnd) {
      const greetings = [
        "早上好～你昨晚睡得好吗？[happy]",
        "新的一天开始了！今天要加油哦！[happy]",
        "早安～希望你今天有个好心情 [shy]",
      ];
      
      // 如果昨天熬夜了，特别关心
      if (state.today.reminders.sleep > 0) {
        return "早上好...你昨晚熬夜了吗...今天要早点休息哦 [shy]";
      }
      
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    return null;
  }

  // ==================== 健康度计算 ====================
  function calculateHealthScore(minutes) {
    if (minutes <= CONFIG.healthScore.excellent) return 100;
    if (minutes <= CONFIG.healthScore.good) return 90;
    if (minutes <= CONFIG.healthScore.fair) return 80;
    if (minutes <= CONFIG.healthScore.moderate) return 60;
    if (minutes <= CONFIG.healthScore.poor) return 40;
    return 20;
  }

  function getHealthLevel(score) {
    if (score >= 100) return { label: '非常健康', emoji: '💚', color: '#4caf50' };
    if (score >= 90) return { label: '健康', emoji: '💙', color: '#2196f3' };
    if (score >= 80) return { label: '良好', emoji: '💛', color: '#ffeb3b' };
    if (score >= 60) return { label: '一般', emoji: '🧡', color: '#ff9800' };
    if (score >= 40) return { label: '偏多', emoji: '❤️', color: '#ff5722' };
    return { label: '过度', emoji: '💔', color: '#f44336' };
  }

  // ==================== 健康建议 ====================
  function getHealthSuggestions() {
    const suggestions = [];
    const totalMinutes = state.today.totalMinutes;
    const hour = new Date().getHours();
    
    // 根据使用时长
    if (totalMinutes > CONFIG.healthScore.poor) {
      suggestions.push("你今天使用时间有点长了，出去走走吧 🌳");
      suggestions.push("和朋友约个饭怎么样？见见真实的人也很重要 👫");
    } else if (totalMinutes > CONFIG.healthScore.moderate) {
      suggestions.push("适当休息一下，活动活动身体 🏃");
      suggestions.push("喝点水，看看窗外，放松一下眼睛 👀");
    } else if (totalMinutes > CONFIG.healthScore.good) {
      suggestions.push("使用习惯很健康，保持下去 💚");
    } else {
      suggestions.push("完美的平衡！你做得很好 ⭐");
    }
    
    // 根据时间段
    if (hour >= CONFIG.sleep.bedtimeStart || hour < CONFIG.sleep.morningStart) {
      suggestions.push("现在是深夜，早点休息对身体好 😴");
    } else if (hour >= 18 && hour < CONFIG.sleep.bedtimeStart) {
      suggestions.push("晚上可以运动一下，放松身心 🏃");
    }
    
    return suggestions;
  }

  // ==================== 辅助函数 ====================
  function getDayName(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} 小时 ${mins} 分钟`;
    }
    return `${mins} 分钟`;
  }

  // ==================== 新增：统计分析功能 ====================
  
  /**
   * 获取本周统计
   */
  function getWeeklyStats() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    const data = days.map(day => state.week[day].totalMinutes);
    const healthScores = days.map(day => state.week[day].healthScore);
    
    const totalMinutes = data.reduce((sum, m) => sum + m, 0);
    const avgMinutes = Math.round(totalMinutes / 7);
    const maxDay = labels[data.indexOf(Math.max(...data))];
    const minDay = labels[data.indexOf(Math.min(...data))];
    
    return {
      labels,
      data,
      healthScores,
      totalMinutes,
      avgMinutes,
      maxDay,
      minDay,
    };
  }
  
  /**
   * 获取本月统计
   */
  function getMonthlyStats() {
    const monthMinutes = state.month.totalMinutes || 0;
    const weeklyTrend = state.month.weeklyTrend || [];
    const healthTrend = state.month.healthTrend || [];
    
    return {
      totalMinutes: monthMinutes,
      weeklyTrend,
      healthTrend,
      avgDaily: Math.round(monthMinutes / 30),
    };
  }
  
  /**
   * 获取使用模式分析
   */
  function getUsagePattern() {
    // 分析最活跃时段
    const sessions = state.today.sessions;
    if (sessions.length === 0) {
      return {
        mostActiveHour: null,
        avgSessionLength: 0,
        totalSessions: 0,
        pattern: 'unknown',
      };
    }
    
    // 统计每小时的使用次数
    const hourCounts = new Array(24).fill(0);
    sessions.forEach(s => {
      const hour = new Date(s.start).getHours();
      hourCounts[hour]++;
    });
    
    const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
    const avgSessionLength = Math.round(state.today.totalMinutes / sessions.length);
    
    // 判断使用模式
    let pattern = 'balanced';  // 平衡型
    if (mostActiveHour >= 22 || mostActiveHour <= 5) {
      pattern = 'night-owl';  // 夜猫子
    } else if (mostActiveHour >= 6 && mostActiveHour <= 9) {
      pattern = 'morning-person';  // 早起者
    } else if (state.today.totalMinutes > 180) {
      pattern = 'heavy-user';  // 重度使用
    }
    
    return {
      mostActiveHour,
      avgSessionLength,
      totalSessions: sessions.length,
      pattern,
    };
  }
  
  /**
   * 获取健康趋势（过去 7 天）
   */
  function getHealthTrend() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const trend = days.map(day => ({
      day,
      minutes: state.week[day].totalMinutes,
      healthScore: state.week[day].healthScore,
    }));
    
    // 计算趋势方向
    const scores = trend.map(t => t.healthScore);
    const avgFirstHalf = (scores[0] + scores[1] + scores[2]) / 3;
    const avgSecondHalf = (scores[4] + scores[5] + scores[6]) / 3;
    
    let direction = 'stable';
    if (avgSecondHalf - avgFirstHalf > 10) {
      direction = 'improving';  // 改善中
    } else if (avgSecondHalf - avgFirstHalf < -10) {
      direction = 'declining';  // 下降中
    }
    
    return {
      trend,
      direction,
      avgScore: Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length),
    };
  }

  function getState() {
    return { ...state };
  }

  function resetState() {
    state = {
      currentSession: {
        startTime: null,
        elapsedMinutes: 0,
        lastReminderTime: null,
        reminderCount: 0,
        reminders: {
          gentle: false,
          moderate: false,
          strong: false,
          serious: false,
          critical: false,
        },
      },
      today: {
        date: new Date().toDateString(),
        totalMinutes: 0,
        sessions: [],
        reminders: {
          usage: 0,
          sleep: 0,
        },
      },
      week: {
        monday: { totalMinutes: 0, healthScore: 100 },
        tuesday: { totalMinutes: 0, healthScore: 100 },
        wednesday: { totalMinutes: 0, healthScore: 100 },
        thursday: { totalMinutes: 0, healthScore: 100 },
        friday: { totalMinutes: 0, healthScore: 100 },
        saturday: { totalMinutes: 0, healthScore: 100 },
        sunday: { totalMinutes: 0, healthScore: 100 },
      },
      preferences: {
        sleepTime: 23,
        wakeTime: 7,
        maxDailyMinutes: 90,
        reminderEnabled: true,
        sleepProtectionEnabled: true,
      },
      statistics: {
        totalSessions: 0,
        longestSession: 0,
        averageSession: 0,
        mostActiveHour: 20,
      },
    };
    saveState();
  }

  // ==================== 公开接口 ====================
  return {
    init,
    startSession,
    endSession,
    getState,
    resetState,
    calculateHealthScore,
    getHealthLevel,
    getHealthSuggestions,
    getMorningGreeting,
    formatMinutes,
    // 新增统计功能
    getWeeklyStats,
    getMonthlyStats,
    getUsagePattern,
    getHealthTrend,
  };
})();
