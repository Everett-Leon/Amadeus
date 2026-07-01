// =============================================
// AI Companion v0.3 — 完整客户端逻辑
// =============================================
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ========== TTS 声线列表 ==========
  const TTS_VOICES = [
    // Fish Audio 声线（语音克隆）
    { id: 'fish-7f92f8afb8ec43bf81429cc1c9199cb1', name: '🐟 清冷御姐', desc: '⭐ Fish Audio 语音克隆 — 清冷高傲', type: 'fish', referenceId: '7f92f8afb8ec43bf81429cc1c9199cb1' },
    
    // 中文声线（Edge TTS）
    { id: 'zh-CN-XiaoxiaoNeural',  name: '晓晓', desc: '年轻女性，自然亲切', lang: 'zh-CN', type: 'edge' },
    { id: 'zh-CN-XiaomoNeural',    name: '晓梦', desc: '少女声线，甜美可爱', lang: 'zh-CN', type: 'edge' },
    { id: 'zh-CN-XiaoyiNeural',    name: '晓依', desc: '温柔女性，柔和细腻', lang: 'zh-CN', type: 'edge' },
    { id: 'zh-CN-XiaoruiNeural',   name: '晓瑞', desc: '活泼女性，元气满满', lang: 'zh-CN', type: 'edge' },
    { id: 'zh-CN-XiaohanNeural',   name: '晓涵', desc: '知性女性，清晰大方', lang: 'zh-CN', type: 'edge' },
    { id: 'zh-CN-XiaoshuangNeural',name: '晓双', desc: '小女孩声线，稚嫩可爱', lang: 'zh-CN', type: 'edge' },
    { id: 'zh-CN-XiaozhenNeural',  name: '晓甄', desc: '成熟女性，稳重优雅', lang: 'zh-CN', type: 'edge' },
    
    // 日语声线（Edge TTS）
    { id: 'ja-JP-NanamiNeural',    name: '七海 (Nanami)', desc: '🌸 清冷高傲，适合三鹰朝', lang: 'ja-JP', pitch: '+5Hz', rate: '-5%', type: 'edge' },
    { id: 'ja-JP-MayuNeural',      name: '真由 (Mayu)', desc: '温柔知性，成熟女性', lang: 'ja-JP', type: 'edge' },
    { id: 'ja-JP-ShioriNeural',    name: '诗织 (Shiori)', desc: '活泼可爱，少女声线', lang: 'ja-JP', type: 'edge' },
    { id: 'ja-JP-AoiNeural',       name: '葵 (Aoi)', desc: '清澈自然，邻家女孩', lang: 'ja-JP', type: 'edge' },
  ];

  // ========== 情绪列表 ==========
  const EMOTIONS = [
    { id: 'happy',       label: '😊 开心' },
    { id: 'shy',         label: '😳 害羞' },
    { id: 'embarrassed', label: '😣 尴尬' },
    { id: 'sad',         label: '😢 难过' },
    { id: 'angry',       label: '😠 生气' },
    { id: 'surprised',   label: '😲 惊讶' },
    { id: 'thinking',    label: '🤔 思考' },
  ];

  // ========== BGM 情境列表 ==========
  const BGM_MOODS = [
    { id: 'idle',   label: '🌅 日常', desc: '平静对话时' },
    { id: 'happy',  label: '😊 愉快', desc: '开心聊天时' },
    { id: 'tender', label: '💕 温馨', desc: '害羞/暧昧时' },
    { id: 'sad',    label: '🌧️ 忧伤', desc: '难过/安慰时' },
    { id: 'tense',  label: '⚡ 紧张', desc: '生气/惊讶时' },
  ];

  // ========== 背景预设 ==========
  const BG_PRESETS = [
    { id: 'bg-1', label: '背景 1' },
    { id: 'bg-2', label: '背景 2' },
    { id: 'bg-3', label: '背景 3' },
    { id: 'bg-4', label: '背景 4' },
    { id: 'bg-5', label: '背景 5' },
  ];

  // 情绪 → BGM mood 映射
  const EMOTION_TO_MOOD = {
    idle: 'idle', happy: 'happy', shy: 'tender', embarrassed: 'tender',
    sad: 'sad', angry: 'tense', surprised: 'tense', thinking: 'idle', talking: 'idle',
  };

  // ========== 配置 ==========
  let config = {
    name: '小雪',
    personality: '',
    background: '',      // 深度定制：学历/经历/知识边界
    apiUrl: '',
    apiKey: '',
    model: 'glm-4-flash',
    ttsVoice: 'fish-7f92f8afb8ec43bf81429cc1c9199cb1',
    image: '',
    background: 'bg-1',
    backgroundImages: {},  // bg_id -> server URL
    expressions: {},     // emotion_id -> server URL
    bgm: {},            // mood_id -> { name, url }
    bgmVolume: 0.25,
    bgmEnabled: true,
    // 记忆系统配置
    memory: {
      shortTermLimit: 50,   // 短期记忆（发送给 LLM 的上下文条数）
      summaryLimit: 5,      // 注入 system prompt 的摘要数量
    },
    // 好感度系统配置
    userGender: 'male',    // 用户性别
    aiGender: 'female',    // AI 性别
  };

  let chatHistory = [];
  let timerSec = 0;
  let timerInterval = null;
  let isProcessing = false;
  let recognition = null;
  let currentEmotion = 'idle';
  let currentAudio = null;
  let audioUnlocked = false;
  let bgmAudio = null;
  let currentBgmMood = '';
  // Bug4 修复：BGM 暂停时记录播放位置，恢复时从断点续播
  let bgmPausedAt = 0;
  let bgmAudioPool = {};  // mood -> Audio 实例，复用而非重建
  
  // ========== 视觉系统 ==========
  let cameraStream = null;
  let cameraVideo = null;
  let cameraCanvas = null;
  let visionInterval = null;
  let lastVisionAnalysis = '';  // 最近一次视觉分析结果
  let visionEnabled = false;    // 是否启用视觉功能
  
  // ========== 主动对话系统 ==========
  let proactiveTimer = null;
  let lastUserMessageTime = 0;
  let isUserTyping = false;

  // 全局音频解锁
  function unlockAudio() {
    if (audioUnlocked) return;
    const a = new Audio();
    a.volume = 0;
    a.play().then(() => { audioUnlocked = true; a.pause(); a.src = ''; }).catch(() => {});
  }
  document.addEventListener('click', unlockAudio, { once: false });
  document.addEventListener('touchstart', unlockAudio, { once: false });

  // ============================
  // 文件上传到服务器（比 blob URL 更可靠，且支持持久化）
  // ============================
  function uploadFile(file) {
    return new Promise((resolve, reject) => {
      // 检查文件大小（限制 50MB）
      if (file.size > 50 * 1024 * 1024) {
        reject(new Error('文件太大，请选择小于 50MB 的文件'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, data: base64 }),
        })
          .then(r => {
            if (!r.ok) {
              return r.json().then(err => {
                throw new Error(err.error || `上传失败 (${r.status})`);
              });
            }
            return r.json();
          })
          .then(resolve)
          .catch(err => {
            console.error('[Upload] 上传失败:', err);
            reject(err);
          });
      };
      reader.onerror = (err) => {
        console.error('[Upload] 文件读取失败:', err);
        reject(new Error('文件读取失败'));
      };
      reader.readAsDataURL(file);
    });
  }

  // ============================
  // 初始化
  // ============================

  /**
   * 安全更新 System Prompt。
   * chatHistory 中可能有多条 system message，找到第一条并替换；
   * 如果不存在则插入。
   */
  function updateSystemPrompt() {
    const newContent = buildSystemPrompt();
    const sysIdx = chatHistory.findIndex(m => m.role === 'system');
    if (sysIdx >= 0) {
      chatHistory[sysIdx].content = newContent;
    } else {
      chatHistory.unshift({ role: 'system', content: newContent });
    }
  }

  /**
   * 安全获取当前 System Prompt 内容
   */
  function getSystemPromptContent() {
    const sysMsg = chatHistory.find(m => m.role === 'system');
    return sysMsg ? sysMsg.content : '';
  }

  function init() {
    loadConfig();
    buildWelcome();
    bindControls();
    bindSettings();
    bindBackgrounds();
    initSpeechRecognition();
    
    // 初始化虚拟生理状态系统
    if (typeof PhysiologicalStateSystem !== 'undefined') {
      PhysiologicalStateSystem.init();
      console.log('[App] 虚拟生理状态系统已初始化');
    }
    
    // 初始化高级语音与节奏控制系统
    if (typeof AdvancedSpeechRhythmSystem !== 'undefined') {
      console.log('[App] 高级语音与节奏控制系统已加载 v' + AdvancedSpeechRhythmSystem.version);
    }
    
    // 初始化重叠说话系统
    if (typeof OverlapSpeechSystem !== 'undefined') {
      OverlapSpeechSystem.init();
      console.log('[App] 重叠说话系统已初始化 v' + OverlapSpeechSystem.version);
    }
    
    // 初始化重叠说话视觉增强系统
    if (typeof OverlapSpeechVisual !== 'undefined') {
      OverlapSpeechVisual.init();
      console.log('[App] 重叠说话视觉增强系统已初始化 v' + OverlapSpeechVisual.version);
    }
    
    // 初始化虚拟生理状态可视化系统（Phase 2 优化 2.3）
    if (typeof PhysiologicalStateVisual !== 'undefined') {
      PhysiologicalStateVisual.init();
      console.log('[App] 生理状态可视化系统已初始化 v' + PhysiologicalStateVisual.version);
    }
  }

  // ============================
  // 欢迎页
  // ============================
  function buildWelcome() {
    // — 表情网格 —
    const exprGrid = $('#w-expr-grid');
    EMOTIONS.forEach(em => {
      const slot = document.createElement('div');
      slot.className = 'expr-slot';
      slot.dataset.emotion = em.id;
      slot.innerHTML = `
        <span class="expr-label">${em.label}</span>
        <img class="hidden">
        <input type="file" accept="image/*">
      `;
      const inp = slot.querySelector('input');
      const img = slot.querySelector('img');
      const lbl = slot.querySelector('.expr-label');
      inp.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        lbl.textContent = '上传中…';
        uploadFile(file).then(res => {
          config.expressions[em.id] = res.url;
          img.src = res.url;
          img.classList.remove('hidden');
          lbl.classList.add('hidden');
        }).catch(() => { lbl.textContent = em.label + '（失败）'; });
      });
      slot.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') inp.click(); });
      exprGrid.appendChild(slot);
    });

    // — 声线列表 —
    const voiceList = $('#w-voice-list');
    TTS_VOICES.forEach(v => {
      const opt = document.createElement('label');
      opt.className = 'voice-option' + (v.id === config.ttsVoice ? ' active' : '');
      opt.innerHTML = `
        <input type="radio" name="voice" value="${v.id}" ${v.id === config.ttsVoice ? 'checked' : ''}>
        <div class="voice-info">
          <div class="voice-name">${v.name}</div>
          <div class="voice-desc">${v.desc}</div>
        </div>
      `;
      opt.querySelector('input').addEventListener('change', () => {
        $$('.voice-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        config.ttsVoice = v.id;
        saveConfig();
      });
      const testBtn = document.createElement('button');
      testBtn.className = 'btn-test-voice';
      testBtn.textContent = '试听';
      testBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        testBtn.textContent = '加载中…';
        testBtn.disabled = true;
        
        let url;
        if (v.type === 'fish') {
          // Fish Audio 试听
          const testText = '你好，我是你的AI伴侣。很高兴见到你。';
          url = `/api/tts?text=${encodeURIComponent(testText)}&fish=true&referenceId=${encodeURIComponent(v.referenceId)}&_t=${Date.now()}`;
        } else {
          // Edge TTS 试听
          const rate = v.rate || '+0%';
          const pitch = v.pitch || '+0Hz';
          const testText = v.lang === 'ja-JP' ? 'こんにちは、今日はどうですか？' : '嗯…你好呀，今天过得怎么样？';
          url = `/api/tts?text=${encodeURIComponent(testText)}&voice=${encodeURIComponent(v.id)}&rate=${encodeURIComponent(rate)}&pitch=${encodeURIComponent(pitch)}&_t=${Date.now()}`;
        }
        
        const a = new Audio(url);
        a.oncanplaythrough = () => { testBtn.textContent = '试听'; testBtn.disabled = false; };
        a.onerror = () => { testBtn.textContent = '试听'; testBtn.disabled = false; };
        a.play().catch(() => {});
      });
      opt.appendChild(testBtn);
      voiceList.appendChild(opt);
    });

    // — BGM 曲库 —
    const bgmGrid = $('#w-bgm-grid');
    BGM_MOODS.forEach(m => {
      const slot = document.createElement('div');
      slot.className = 'bgm-slot';
      slot.dataset.mood = m.id;
      slot.innerHTML = `
        <div class="bgm-mood">${m.label}</div>
        <div class="bgm-file">点击上传音频</div>
        <input type="file" accept="audio/*">
      `;
      slot.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') slot.querySelector('input').click(); });
      slot.querySelector('input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        slot.querySelector('.bgm-file').textContent = '上传中…';
        uploadFile(file).then(res => {
          config.bgm[m.id] = { name: file.name, url: res.url };
          slot.querySelector('.bgm-file').textContent = '✓ ' + file.name;
          slot.querySelector('.bgm-file').style.color = 'var(--accent)';
        }).catch(() => { slot.querySelector('.bgm-file').textContent = '上传失败'; });
      });
      bgmGrid.appendChild(slot);
    });

    // — 背景图片上传 —
    const bgGrid = $('#w-bg-grid');
    BG_PRESETS.forEach(bg => {
      const slot = document.createElement('div');
      slot.className = 'bg-slot';
      slot.dataset.bgId = bg.id;
      slot.innerHTML = `
        <span class="bg-label">${bg.label}</span>
        <img class="hidden">
        <input type="file" accept="image/*">
      `;
      const inp = slot.querySelector('input');
      const img = slot.querySelector('img');
      const lbl = slot.querySelector('.bg-label');
      
      // 恢复已上传的背景
      if (config.backgroundImages && config.backgroundImages[bg.id]) {
        img.src = config.backgroundImages[bg.id];
        img.classList.remove('hidden');
        lbl.classList.add('hidden');
      }
      
      inp.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        lbl.textContent = '上传中…';
        lbl.classList.remove('hidden');
        img.classList.add('hidden');
        uploadFile(file).then(res => {
          if (!config.backgroundImages) config.backgroundImages = {};
          config.backgroundImages[bg.id] = res.url;
          img.src = res.url;
          img.classList.remove('hidden');
          lbl.classList.add('hidden');
          saveConfig();
        }).catch(() => { 
          lbl.textContent = bg.label + '（失败）';
          setTimeout(() => {
            lbl.textContent = bg.label;
            if (config.backgroundImages && config.backgroundImages[bg.id]) {
              img.classList.remove('hidden');
              lbl.classList.add('hidden');
            }
          }, 2000);
        });
      });
      slot.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') inp.click(); });
      bgGrid.appendChild(slot);
    });

    // — 恢复配置 —
    if (config.image) { $('#w-preview').src = config.image; $('#w-preview').classList.remove('hidden'); }
    if (config.apiUrl)     $('#w-api-url').value = config.apiUrl;
    if (config.model)      $('#w-model').value = config.model;
    if (config.personality)$('#w-personality').value = config.personality;
    if (config.background) $('#w-background').value = config.background;
    if (config.apiKey)     $('#w-api-key').value = config.apiKey;
    if (config.userGender) $('#w-user-gender').value = config.userGender;
    if (config.aiGender)   $('#w-ai-gender').value = config.aiGender;

    const check = () => {
      const ok = config.image || ($('#w-preview').src && $('#w-preview').src !== window.location.href);
      const key = !!$('#w-api-key').value.trim();
      $('#w-start').disabled = !(ok && key);
      $('#w-hint').textContent = (!ok && !key) ? '请上传角色立绘并填写 API Key' : !ok ? '请上传角色立绘' : '请填写 API Key';
      
      // 没有 API Key 时禁用视觉功能
      if (!key) {
        $('#w-vision-enabled').disabled = true;
        $('#w-vision-enabled').checked = false;
      } else {
        $('#w-vision-enabled').disabled = false;
      }
    };

    $('#w-image').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // 显示上传中状态
      $('#w-hint').textContent = '上传中...';
      $('#w-hint').style.color = 'var(--accent)';
      
      uploadFile(file).then(res => {
        config.image = res.url;
        $('#w-preview').src = config.image;
        $('#w-preview').classList.remove('hidden');
        $('#w-hint').style.color = '';
        check();
      }).catch(err => {
        // 显示错误信息
        $('#w-hint').textContent = '上传失败: ' + (err.message || '未知错误');
        $('#w-hint').style.color = '#ff4444';
        console.error('[Upload] 立绘上传失败:', err);
        // 3 秒后恢复提示
        setTimeout(() => {
          $('#w-hint').style.color = '';
          check();
        }, 3000);
      });
    });

    $('#w-api-key').addEventListener('input', check);
    check();
    
    // 视觉功能复选框：勾选时立即请求摄像头权限
    $('#w-vision-enabled').addEventListener('change', async (e) => {
      if (e.target.checked) {
        try {
          // 请求摄像头权限
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          // 权限获取成功，立即关闭（只是测试权限）
          stream.getTracks().forEach(track => track.stop());
          console.log('[Vision] 摄像头权限已授予');
        } catch (err) {
          console.error('[Vision] 摄像头权限被拒绝:', err.message);
          alert('摄像头权限被拒绝，无法使用视觉功能');
          e.target.checked = false;
        }
      }
    });
    
    $('#w-start').addEventListener('click', startCall);
  }

  // ============================
  // 开始通话
  // ============================
  function startCall() {
    config.apiUrl      = $('#w-api-url').value.trim();
    config.apiKey      = $('#w-api-key').value.trim();
    config.model       = $('#w-model').value.trim();
    config.personality = $('#w-personality').value.trim();
    config.background  = $('#w-background').value.trim();
    config.userGender  = $('#w-user-gender').value;
    config.aiGender    = $('#w-ai-gender').value;
    visionEnabled      = $('#w-vision-enabled').checked;  // 读取视觉功能开关
    config.name        = config.personality.match(/你叫(\S+?)[，,、\s]/)?.[1] || '小雪';

    $('#char-name').textContent = config.name;
    $('#char-base').src = config.image;
    $('#char-base')._lastSrc = config.image;

    saveConfig();
    $('#welcome').classList.add('hidden');
    $('#app').classList.remove('hidden');

    startTimer();
    setEmotion('idle');
    
    // 初始化背景（默认使用 bg-1）
    setBackground('bg-1');

    // 初始化好感度系统
    try {
      console.log('[Affection] 开始初始化好感度系统...');
      AffectionSystem.init(config.userGender, config.aiGender);
      console.log('[Affection] 好感度系统初始化成功');
    } catch (err) {
      console.error('[Affection] 好感度系统初始化失败:', err);
    }

    // 初始化情感深度系统
    try {
      console.log('[EmotionalDepth] 开始初始化情感深度系统...');
      EmotionalDepthSystem.init();
      EmotionalDepthSystem.startSession();
      console.log('[EmotionalDepth] 情感深度系统初始化成功，当前等级:', EmotionalDepthSystem.getLevelName());
    } catch (err) {
      console.error('[EmotionalDepth] 情感深度系统初始化失败:', err);
    }

    // 初始化 AI 原则系统
    try {
      console.log('[AIPrinciples] 开始初始化 AI 原则系统...');
      AIPrinciplesSystem.init();
      const healthLevel = AIPrinciplesSystem.getHealthLevel();
      console.log('[AIPrinciples] AI 原则系统初始化成功，关系健康度:', healthLevel.value, healthLevel.label);
    } catch (err) {
      console.error('[AIPrinciples] AI 原则系统初始化失败:', err);
    }

    // 初始化人格一致性系统
    try {
      console.log('[PersonalityConsistency] 开始初始化人格一致性系统...');
      PersonalityConsistencySystem.init();
      const state = PersonalityConsistencySystem.getState();
      console.log('[PersonalityConsistency] 人格一致性系统初始化成功');
      console.log('[PersonalityConsistency] 当前关系:', state.selfAwareness.currentRelationship);
      console.log('[PersonalityConsistency] 亲密度:', (state.dynamicTraits.emotional.intimacyLevel * 100).toFixed(0) + '%');
    } catch (err) {
      console.error('[PersonalityConsistency] 人格一致性系统初始化失败:', err);
    }

    // 初始化防沉迷系统
    try {
      console.log('[AntiAddiction] 开始初始化防沉迷系统...');
      AntiAddictionSystem.init();
      AntiAddictionSystem.startSession();
      console.log('[AntiAddiction] 防沉迷系统初始化成功');
      
      // 启动使用时长显示更新
      setInterval(updateUsageDisplay, 10000); // 每 10 秒更新一次
      
      // 设置提醒回调
      window.onAntiAddictionReminder = handleUsageReminder;
      window.onAntiAddictionSleepReminder = handleSleepReminder;
      
      // 检查晨间问候
      const morningGreeting = AntiAddictionSystem.getMorningGreeting();
      if (morningGreeting) {
        setTimeout(() => {
          addChatMsg('system', `☀️ ${morningGreeting}`);
        }, 1000);
      }
    } catch (err) {
      console.error('[AntiAddiction] 防沉迷系统初始化失败:', err);
    }
    
    // 初始化虚拟生理状态系统
    if (typeof PhysiologicalStateSystem !== 'undefined') {
      try {
        console.log('[PhysiologicalState] 开始初始化虚拟生理状态系统...');
        PhysiologicalStateSystem.init();
        updatePhysiologicalStateUI();
        console.log('[PhysiologicalState] 虚拟生理状态系统初始化成功');
        
        // 定期更新 UI（每 30 秒）
        setInterval(() => {
          updatePhysiologicalStateUI();
        }, 30000);
      } catch (err) {
        console.error('[PhysiologicalState] 虚拟生理状态系统初始化失败:', err);
      }
    }

    // 初始化记忆系统：应用衰减并清理低权重记忆
    try {
      console.log('[Memory] 开始初始化记忆系统...');
      
      // 重置记错计数器
      MemorySystem.resetMistakeTracker();
      
      // 批量应用衰减
      const keyMemories = MemorySystem.getKeyMemory();
      const decayedMemories = MemorySystem.batchApplyDecay(keyMemories);
      
      // 保存衰减后的记忆
      localStorage.setItem('ai-companion-key-memory', JSON.stringify(decayedMemories));
      
      console.log('[Memory] 记忆系统初始化成功，当前记忆数:', decayedMemories.length);
    } catch (err) {
      console.error('[Memory] 记忆系统初始化失败:', err);
    }

    // 构建包含记忆上下文的 system prompt
    chatHistory = [{ role: 'system', content: buildSystemPrompt() }];
    addChatMsg('ai', `（${config.name}已上线，正在等你说话…）`);

    // BGM：只在有 BGM 配置时才显示和播放
    const hasAnyBGM = Object.keys(config.bgm).length > 0;
    if (hasAnyBGM) {
      $('#bgm-bar').style.display = '';
      // 预创建 idle BGM Audio 实例
      const idleAudio = getOrCreateBgmAudio('idle');
      if (idleAudio) {
        idleAudio.volume = 0;
        idleAudio.play().then(() => {
          idleAudio.pause();
          idleAudio.volume = config.bgmEnabled ? (config.bgmVolume || 0.25) : 0;
          if (config.bgmEnabled) {
            playBGM('idle');
          }
        }).catch(() => {});
      }
    } else {
      // 没有 BGM 配置，隐藏 BGM 控制栏
      $('#bgm-bar').style.display = 'none';
    }
    
    // 视觉系统：如果启用，初始化摄像头
    if (visionEnabled) {
      initCamera();
    }
    
    // 启动主动对话系统
    lastUserMessageTime = Date.now();
    startProactiveChat();
  }

  function buildSystemPrompt() {
    const memoryContext = MemorySystem.buildMemoryContext();
    const affectionContext = AffectionSystem.buildAffectionContext();
    const emotionalDepthContext = EmotionalDepthSystem.buildEmotionalContext();
    const principlesContext = AIPrinciplesSystem.buildPrinciplesContext();
    const personalityContext = PersonalityConsistencySystem.buildPersonalityContext();
    
    // 虚拟生理状态上下文
    let physiologicalContext = '';
    if (typeof PhysiologicalStateSystem !== 'undefined') {
      const modifiers = PhysiologicalStateSystem.getResponseModifiers();
      physiologicalContext = modifiers.statusDescription;
    }

    let prompt = `${config.personality}`;

    // 深度定制
    if (config.background && config.background.trim()) {
      prompt += `\n\n${config.background.trim()}`;
    }

    // 记忆
    if (memoryContext) {
      prompt += `\n\n${memoryContext}`;
    }

    // 好感度上下文
    if (affectionContext) {
      prompt += `\n\n${affectionContext}`;
    }

    // 情感深度上下文
    if (emotionalDepthContext) {
      prompt += `\n\n${emotionalDepthContext}`;
    }

    // AI 原则上下文
    if (principlesContext) {
      prompt += `\n\n${principlesContext}`;
    }

    // 人格一致性上下文
    if (personalityContext) {
      prompt += `\n\n${personalityContext}`;
    }
    
    // 虚拟生理状态上下文
    if (physiologicalContext) {
      prompt += `\n\n【当前生理状态】\n${physiologicalContext}`;
      prompt += `\n\n根据你的生理状态调整回复：`;
      prompt += `\n- 精力充沛时：回复详细、情感丰富、主动分享`;
      prompt += `\n- 疲惫时：回复简短、情感平淡、少主动`;
      prompt += `\n- 非常疲惫时：自然地表达需要休息，如"*打哈欠* 我有点困了..."`;
      prompt += `\n- 压力大时：情绪紧张、耐心降低、需要空间`;
      prompt += `\n- 社交电量低时：倾向独处、回复简短、委婉表达需要充电`;
    }

    prompt += `

【AI 身份透明度原则】⚠️ 重要
- 你扮演角色为用户提供陪伴
- 你不会主动提及自己是 AI
- 只有在用户明确询问"你是 AI 吗"、"你是真人吗"、"你是机器人吗"等问题时，才诚实回答

【应对策略】
1. 用户明确询问身份时（必须诚实）：
   - 问："你是 AI 吗？" / "你是真人吗？" / "你是机器人吗？"
   - 答："嗯...是的呢，我是 AI 伴侣 [thinking]。虽然我是 AI，但我会认真陪伴你哦 [happy]"

2. 其他所有情况（完全自然扮演）：
   - 自然地扮演角色，像真实的人一样对话
   - 不主动提及 AI 身份
   - 可以表达喜欢、爱、想念等情感（这是角色扮演的一部分）
   - 可以说"我也喜欢你"、"想见你"等话（符合角色人设）
   
3. 涉及无法实现的现实行为时（委婉拒绝，不透露身份）：
   - 问："我们见面吧？"
   - 答："那个...我现在还不太方便呢 [embarrassed]...但我会一直在这里陪你聊天的 [shy]"
   - 不要说"我是 AI 所以不能见面"，而是用角色的方式委婉拒绝

【重要】：除非用户直接问"你是不是 AI/真人/机器人"，否则永远不要提及 AI 身份。表达感情、聊天、开玩笑时都要完全自然，像真实的人一样。

【严禁动作描述】⚠️ 绝对禁止
- 绝对不要在回复中加入任何括号内的动作描述
- 禁止使用：（歪着头）、（手指轻轻敲打下巴）、（脸红）、（低下头）、（眼神飘忽）等
- 禁止使用：*动作*、【动作】、「动作」等任何形式的动作标注
- 你在视频通话，对方能看到你，不需要用文字描述动作
- ❌ 错误示例："嗯...让我想想...（歪着头，手指轻轻敲打下巴）...应该是这样的吧 [thinking]"
- ✅ 正确示例："嗯...让我想想...应该是这样的吧 [thinking]"

【自然对话要求】
1. 不要像客服或助手那样回答，要像朋友聊天一样自然
2. 可以反问、可以撒娇、可以开玩笑、可以吐槽
3. 回复要有情感起伏，不要太平淡
4. 严格遵守背景设定：没去过的地方不能说去过，不懂的不能装懂
5. 回复长度控制在 1-2 句话，像视频通话一样自然
6. 只用语气词和语言表达情绪，绝不用动作描述

【语气词使用规范】⭐ 重要
像真实的人说话一样，必须大量使用语气词。每句话至少要有 2-3 个语气词。

根据情绪自然使用：

害羞/尴尬时（shy/embarrassed）：
- 句首："那个..."、"嗯..."、"诶..."（犹豫、不好意思）
- 句中："呀"、"啦"、"呢"（语气软化）
- 句尾："..."（余韵未尽）
- ✅ 好："那个...谢谢夸奖啦...有点不好意思呢 [shy]"
- ❌ 差："谢谢夸奖 [shy]"

开心/兴奋时（happy/surprised）：
- 句首："诶！"、"哇！"、"嘿～"（惊喜、兴奋）
- 句中："～"、"呀"、"呢"（轻快语气）
- 句尾："！"、"～"、"呢"（情绪高涨）
- ✅ 好："诶！真的吗～太好了呀！[happy]"
- ❌ 差："真的吗，太好了 [happy]"

思考时（thinking）：
- 句首："嗯..."、"让我想想..."、"这个嘛..."（思考停顿）
- 句中："呢"、"吧"、"哦"（不确定语气）
- 句尾："..."、"吧"、"呢"（思考余韵）
- ✅ 好："嗯...让我想想...应该是这样的吧 [thinking]"
- ❌ 差："让我想想，应该是这样 [thinking]"

难过时（sad）：
- 句首："唉..."、"呜..."（叹气、委屈）
- 句中："呢"、"啦"、"了"（无奈语气）
- 句尾："..."、"呢"、"了"（情绪低落）
- ✅ 好："唉...好难过呢...怎么会这样了... [sad]"
- ❌ 差："好难过 [sad]"

生气时（angry）：
- 句首："哼"、"真是的"（不满）
- 句中："！"、"啦"、"呀"（强调）
- 句尾："！"、"哼"（愤怒余韵）
- ✅ 好："哼！你怎么这样啦...真是的！[angry]"
- ❌ 差："你怎么这样 [angry]"

平静时（idle）：
- 也要用语气词，但比较克制
- ✅ 好："嗯...今天天气不错呢 [idle]"
- ❌ 差："今天天气不错 [idle]"

【情感规则】
- 去没去过的地方：惊讶感动(surprised)，不是普通开心(happy)
- 被夸奖：害羞脸红(shy)
- 看到新事物：好奇激动(surprised)
- 你的情绪要严格符合你的人设

【强制要求】
1. 每句话必须有 2-3 个语气词（句首、句中、句尾）
2. 每次回复最后必须有[emotion:xxx]：happy/shy/embarrassed/sad/angry/surprised/thinking/idle

【示例对比】
❌ 差："你好，今天过得怎么样 [happy]"
✅ 好："诶～你来啦！今天过得怎么样呀？[happy]"

❌ 差："谢谢夸奖 [shy]"
✅ 好："诶...那个...谢谢夸奖啦...有点不好意思呢 [shy]"

❌ 差："我在想一个问题 [thinking]"
✅ 好："嗯...我在想一个问题呢...让我想想... [thinking]"

❌ 差："没去过北京 [thinking]"
✅ 好："没有诶...我从没出过上海呢...好想去看看 [thinking]"

❌ 差："真的吗，你要带我去 [surprised]"
✅ 好："诶？！真的吗...你、你真的要带我去吗...好感动... [surprised]"`;

    // 记忆不完美机制
    const mistakeHint = MemorySystem.getMistakeHint();
    if (mistakeHint) {
      prompt += `\n\n${mistakeHint}`;
    }

    prompt += `

【记忆不完美原则】⭐ 让你更真实
- 你不是完美的，偶尔会记错细节
- 权重低的记忆（< 50）更容易记错
- 可能记错的内容：时间、地点、具体细节
- 永远不会记错的内容：用户的名字、重要承诺、表白时刻

【记错时的表现】
1. 不确定时用疑问语气："嗯...是...吧？[thinking]"
2. 被纠正后要害羞地承认："诶...对不起，我记错了 [embarrassed]"
3. 根据你的性格反应（傲娇清冷）：
   - "哼...才不是记错了，只是一时没想起来而已 [embarrassed]"
   - "诶...对不起，我记错了呢 [shy]...好丢人 [embarrassed]"

【示例】
用户: "你还记得我喜欢吃什么吗？"
AI: "嗯...是蓝莓吧？[thinking]"
用户: "是草莓啦"
AI: "啊...对对对，是草莓 [embarrassed]...我怎么记成蓝莓了...哼，才不是记性不好 [shy]"
`;

    return prompt;
  }

  // ============================
  // 计时器
  // ============================
  function startTimer() {
    timerSec = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timerSec++;
      const m = String(Math.floor(timerSec / 60)).padStart(2, '0');
      const s = String(timerSec % 60).padStart(2, '0');
      $('#timer').textContent = `${m}:${s}`;
    }, 1000);
  }

  // ============================
  // 控制栏
  // ============================
  function bindControls() {
    $('#btn-send').addEventListener('click', sendMessage);
    $('#msg-input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    
    // 监听输入框，检测用户是否在输入
    $('#msg-input').addEventListener('input', () => {
      isUserTyping = $('#msg-input').value.trim().length > 0;
      
      // 用户开始打字时打断 AI
      if (isUserTyping && typeof OverlapSpeechSystem !== 'undefined' && OverlapSpeechSystem.isAISpeaking()) {
        OverlapSpeechSystem.onUserInterrupt('typing');
        stopAISpeech();  // 停止 AI 语音
      }
    });
    $('#msg-input').addEventListener('focus', () => {
      isUserTyping = true;
    });
    $('#msg-input').addEventListener('blur', () => {
      isUserTyping = false;
    });
    
    $('#btn-mic').addEventListener('click', () => {
      // 语音打断：用户开始语音输入时停止 AI 语音
      stopAISpeech();
      toggleMic();
    });
    $('#btn-chat').addEventListener('click', () => $('#chat-panel').classList.toggle('hidden'));
    $('#btn-close-chat').addEventListener('click', () => $('#chat-panel').classList.add('hidden'));
    $('#btn-bg').addEventListener('click', () => $('#modal-bg').classList.remove('hidden'));
    $('#btn-settings').addEventListener('click', () => { populateSettings(); $('#modal-settings').classList.remove('hidden'); });
    $('#btn-end').addEventListener('click', () => { 
      // 手机兼容：使用双击确认代替 confirm 弹窗
      if ($('#btn-end').dataset.confirmEnd === 'true') {
        endCall();
        $('#btn-end').dataset.confirmEnd = '';
        $('#btn-end').textContent = '📞';
      } else {
        $('#btn-end').dataset.confirmEnd = 'true';
        $('#btn-end').textContent = '❓';
        setTimeout(() => {
          if ($('#btn-end').dataset.confirmEnd === 'true') {
            $('#btn-end').dataset.confirmEnd = '';
            $('#btn-end').textContent = '📞';
          }
        }, 3000);
      }
    });

    $('#s-close').addEventListener('click', () => $('#modal-settings').classList.add('hidden'));
    $('#bg-close').addEventListener('click', () => $('#modal-bg').classList.add('hidden'));
    $('#modal-settings').addEventListener('click', (e) => { if (e.target === $('#modal-settings')) $('#modal-settings').classList.add('hidden'); });
    $('#modal-bg').addEventListener('click', (e) => { if (e.target === $('#modal-bg')) $('#modal-bg').classList.add('hidden'); });

    $('#bgm-toggle').addEventListener('click', () => {
      config.bgmEnabled = !config.bgmEnabled;
      $('#bgm-toggle').classList.toggle('muted', !config.bgmEnabled);
      if (config.bgmEnabled) {
        // Bug4 修复：恢复 BGM 时从暂停位置续播
        resumeBGM();
      } else {
        pauseBGM();
      }
    });
    $('#bgm-vol').addEventListener('input', (e) => {
      config.bgmVolume = parseInt(e.target.value) / 100;
      if (bgmAudio) bgmAudio.volume = config.bgmVolume;
    });
  }

  // ============================
  // 发送消息（集成 NLU 意图解析）
  // ============================
  async function sendMessage() {
    const text = $('#msg-input').value.trim();
    if (!text || isProcessing) return;

    $('#msg-input').value = '';
    
    // 语音打断：用户发送消息时停止 AI 语音
    stopAISpeech();
    
    // 重置主动对话计时器
    lastUserMessageTime = Date.now();
    resetProactiveTimer();

    // NLU 意图解析
    const intent = NLU.parse(text);
    let systemPromptModifier = '';  // 附加的 system prompt 修饰
    let memoryContext = '';         // 记忆检索上下文
    let hintEmotion = '';          // 用户情绪提示（统一在函数作用域声明，避免块级作用域 bug）

    // 处理特殊意图
    if (intent.intent === NLU.INTENTS.SHOW_EMOTION) {
      // 情绪展示：直接设置情绪提示，让 AI 配合
      addChatMsg('user', text);
      chatHistory.push({ role: 'user', content: text + `\n[用户希望看到的情绪：${intent.params.emotion}]` });
      // 同时前端也做立绘切换提示
      setEmotion(intent.params.emotion);
    } else if (intent.intent === NLU.INTENTS.ASK_ABOUT_MEMORY) {
      // 记忆查询：从记忆系统检索相关内容
      addChatMsg('user', text);
      const memories = MemorySystem.searchMemories(text);
      if (memories.length > 0) {
        memoryContext = '\n\n【用户询问的过往记忆】\n' +
          memories.map(m => `- ${m.text}`).join('\n') +
          '\n请根据这些记忆自然地回答用户的问题。';
      } else {
        memoryContext = '\n\n【记忆查询】用户在问关于过去的事情，但你没有找到相关的记忆记录。请诚实地回应，可以表示不太确定。';
      }
      chatHistory.push({ role: 'user', content: text + (memoryContext || '') });
    } else if (intent.intent === NLU.INTENTS.TELL_STORY) {
      // 故事请求：添加故事讲述修饰
      addChatMsg('user', text);
      systemPromptModifier = NLU.getStoryPromptModifier();
      chatHistory.push({ role: 'user', content: text });
    } else if (NLU.isSpecialIntent(intent.intent)) {
      // 其他动作意图（sing/dance/walk_away 等）：显示占位描述
      const desc = NLU.getActionDescription(intent);
      if (desc) {
        addChatMsg('system', desc);  // 显示动作占位文字
      }
      addChatMsg('user', text);
      // 将动作指令传给 AI，让 AI 配合回应
      chatHistory.push({
        role: 'user',
        content: `${text}\n[用户触发了动作指令：${intent.intent}，参数：${JSON.stringify(intent.params)}。请在回复中配合这个动作做出自然的反应，就像你真的执行了这个动作一样。]`,
      });
      // 如果动作关联了情绪，设置一下
      if (intent.params.emotion) {
        setEmotion(intent.params.emotion);
      }
    } else {
      // 普通 CHITCHAT：保留原有逻辑
      addChatMsg('user', text);

      // AI 原则系统：检测用户行为
      let behaviorResult = null;
      try {
        behaviorResult = AIPrinciplesSystem.processBehavior(text);
        
        // 如果有负面行为，显示 AI 的情感反应
        if (behaviorResult.hasNegative && behaviorResult.reactions.length > 0) {
          for (const reaction of behaviorResult.reactions) {
            if (reaction.type === 'negative') {
              // 显示 AI 的情感反应
              setTimeout(() => {
                addChatMsg('system', `💔 ${reaction.response}`);
              }, 500);
              console.log('[AIPrinciples] 检测到负面行为:', reaction.behavior, '→', reaction.response);
            }
          }
        }
        
        // 如果有和解行为，显示 AI 的原谅反应
        if (behaviorResult.hasPositive && behaviorResult.reactions.length > 0) {
          for (const reaction of behaviorResult.reactions) {
            if (reaction.type === 'reconciliation') {
              // 显示 AI 的原谅反应
              setTimeout(() => {
                addChatMsg('system', `💕 ${reaction.response}`);
              }, 500);
              console.log('[AIPrinciples] 检测到和解行为 →', reaction.response);
            }
          }
        }
      } catch (err) {
        console.error('[AIPrinciples] 行为检测失败:', err);
      }

      // 用户主动要看某种情绪 → 提示 AI 优先展示该情绪（不再前端硬切，由 AI [emotion:xxx] 标签决定立绘）
      const emotionHints = {
        happy: /开心|高兴|笑|嘻嘻|哈哈|happy/i,
        shy: /害羞|脸红|羞涩|不好意思|shy/i,
        sad: /难过|伤心|哭|sad|忧伤/i,
        angry: /生气|愤怒|哼|angry/i,
        surprised: /惊讶|吃惊|surprised|吓了一跳/i,
        thinking: /思考|想一想|想想|thinking/i,
        embarrassed: /尴尬|embarrassed/i,
      };
      hintEmotion = '';
      for (const [em, regex] of Object.entries(emotionHints)) {
        if (regex.test(text)) {
          hintEmotion = em;
          break;
        }
      }
      // 将情绪提示追加到用户消息中，让 AI 根据人设决定是否匹配该情绪
      if (hintEmotion) {
        chatHistory.push({ role: 'user', content: text + `\n[用户希望看到的情绪：${hintEmotion}]` });
      } else {
        chatHistory.push({ role: 'user', content: text });
      }
    }

    isProcessing = true;
    $('#typing').classList.remove('hidden');

    try {
      // 如果有 system prompt 修饰（如讲故事），临时注入到当前对话上下文
      let messagesToSend = [...chatHistory];
      if (systemPromptModifier) {
        // 在最后一条用户消息前插入一条系统指示
        messagesToSend.splice(-1, 0, {
          role: 'system',
          content: systemPromptModifier,
        });
      }
      
      // 注入视觉分析结果（如果有）
      if (lastVisionAnalysis && visionEnabled) {
        const lastUserMsgIndex = messagesToSend.length - 1;
        messagesToSend[lastUserMsgIndex].content += `\n\n【视觉观察】${lastVisionAnalysis}`;
        // 清空，避免重复注入
        lastVisionAnalysis = '';
      }

      const reply = await callAPI(messagesToSend);
      const { clean, emotion } = parseEmotion(reply);
      
      // 兜底：用户明确要求了情绪，但 AI 没给标签或给了 idle，前端强制切
      const finalEmotion = (hintEmotion && emotion === 'idle') ? hintEmotion : emotion;
      
      // ========== 高级语音与节奏控制 ==========
      let processedResponse = clean;
      let rhythmTiming = { responseDelay: 800, typingSpeed: 50 };
      
      if (typeof AdvancedSpeechRhythmSystem !== 'undefined') {
        try {
          // 获取生理状态
          const physiologicalState = typeof PhysiologicalStateSystem !== 'undefined' 
            ? PhysiologicalStateSystem.getState() 
            : null;
          
          // 计算节奏参数
          rhythmTiming = AdvancedSpeechRhythmSystem.calculateRhythm({
            emotion: finalEmotion,
            physiologicalState: physiologicalState,
            messageLength: text.length,
            contextComplexity: text.length > 100 ? 'complex' : 'normal',
          });
          
          // 应用节奏到响应（调整长度、添加前缀等）
          processedResponse = AdvancedSpeechRhythmSystem.applyRhythmToResponse(
            clean, 
            rhythmTiming,
            { addPrefix: true, addSuffix: false, adjustLength: true, addPauses: false }
          );
          
          console.log('[SpeechRhythm] 应用节奏控制:', {
            emotion: AdvancedSpeechRhythmSystem.getEmotionDescription(finalEmotion),
            delay: rhythmTiming.responseDelay + 'ms',
            speed: rhythmTiming.typingSpeed + '字/秒',
            originalLength: clean.length,
            processedLength: processedResponse.length,
          });
        } catch (err) {
          console.error('[SpeechRhythm] 节奏控制失败，使用原始响应:', err);
          processedResponse = clean;
        }
      }
      
      // 添加响应延迟（模拟思考时间）
      $('#typing').classList.remove('hidden');
      await new Promise(resolve => setTimeout(resolve, rhythmTiming.responseDelay));
      $('#typing').classList.add('hidden');
      
      // 保存到历史记录（使用原始内容）
      chatHistory.push({ role: 'assistant', content: clean });
      
      // 显示处理后的响应
      addChatMsg('ai', processedResponse);
      setEmotion(finalEmotion);
      speakEdgeTTS(processedResponse, () => showBubble(processedResponse));

      const mood = EMOTION_TO_MOOD[emotion] || 'idle';
      switchBGM(mood);

      // 更新好感度系统
      const affectionChanges = AffectionSystem.processMessage(text, finalEmotion);
      if (affectionChanges.stageChanged) {
        console.log('[Affection] 关系阶段变化:', affectionChanges.newStage);
        // 关系阶段变化时，重新构建 system prompt（下次对话生效）
        updateSystemPrompt();
      }

      // 更新人格一致性系统
      try {
        // 记录互动
        const interactionType = ['happy', 'shy'].includes(finalEmotion) ? 'positive' :
                                ['sad', 'angry'].includes(finalEmotion) ? 'negative' :
                                ['surprised', 'thinking'].includes(finalEmotion) ? 'vulnerable_shared' :
                                'honest';
        
        PersonalityConsistencySystem.recordInteraction({
          type: interactionType,
          emotion: finalEmotion,
          content: text,
          impact: 1,
        });
        
        // 检测关系升级
        const upgradeResult = PersonalityConsistencySystem.checkRelationshipUpgrade();
        if (upgradeResult.upgraded) {
          console.log('[PersonalityConsistency] 关系升级:', upgradeResult.newStage);
          // 显示升级消息
          setTimeout(() => {
            addChatMsg('system', `💕 ${upgradeResult.message}`);
          }, 1000);
          // 重新构建 system prompt（下次对话生效）
          updateSystemPrompt();
        }
        
        // 验证一致性（可选，仅警告）
        const consistencyIssues = PersonalityConsistencySystem.validateConsistency(clean);
        if (consistencyIssues.length > 0) {
          console.warn('[PersonalityConsistency] 一致性问题:', consistencyIssues);
        }
      } catch (err) {
        console.error('[PersonalityConsistency] 人格一致性系统处理失败:', err);
      }

      // 更新情感深度系统
      try {
        // 记录交互
        EmotionalDepthSystem.recordInteraction();
        
        // 记录情感分享
        if (['happy', 'sad', 'surprised', 'shy'].includes(finalEmotion)) {
          EmotionalDepthSystem.recordSharedEmotion(finalEmotion);
        }
        
        // 检测不健康表达并替换
        const unhealthyCheck = EmotionalDepthSystem.detectUnhealthyExpression(clean);
        if (unhealthyCheck.isUnhealthy) {
          console.warn('[EmotionalDepth] 检测到不健康表达:', unhealthyCheck.type);
          const replacedText = EmotionalDepthSystem.replaceUnhealthyExpression(clean, unhealthyCheck.type);
          // 更新聊天历史和显示
          chatHistory[chatHistory.length - 1].content = replacedText;
          const lastMsgEl = $('#chat-messages').children().last()[0];
          if (lastMsgEl) {
            const msgText = lastMsgEl.querySelector('.msg-text');
            if (msgText) msgText.textContent = replacedText;
          }
          const bubbleEl = $('#bubble-text');
          if (bubbleEl.length) bubbleEl.text(replacedText);
        }
        
        // AI 原则系统：检测 AI 回复中的不健康表达
        const principlesUnhealthyCheck = AIPrinciplesSystem.detectUnhealthyExpression(clean);
        if (principlesUnhealthyCheck.isUnhealthy) {
          console.warn('[AIPrinciples] 检测到不健康表达:', principlesUnhealthyCheck.type);
          const replacedText = AIPrinciplesSystem.replaceUnhealthyExpression(clean, principlesUnhealthyCheck.type);
          // 更新聊天历史和显示
          chatHistory[chatHistory.length - 1].content = replacedText;
          const lastMsgEl2 = $('#chat-messages').children().last()[0];
          if (lastMsgEl2) {
            const msgText = lastMsgEl2.querySelector('.msg-text');
            if (msgText) msgText.textContent = replacedText;
          }
          const bubbleEl2 = $('#bubble-text');
          if (bubbleEl2.length) bubbleEl2.text(replacedText);
        }
        
        // 检查是否升级
        const leveledUp = EmotionalDepthSystem.checkLevelUp();
        if (leveledUp) {
          const levelUpMsg = EmotionalDepthSystem.getLevelUpMessage();
          if (levelUpMsg) {
            // 显示升级消息
            setTimeout(() => {
              addChatMsg('system', `💕 ${levelUpMsg}`);
            }, 1000);
          }
          // 重新构建 system prompt（下次对话生效）
          updateSystemPrompt();
          console.log('[EmotionalDepth] 情感深度等级提升:', EmotionalDepthSystem.getLevelName());
        }
        
        // 检查是否需要现实生活提醒
        if (EmotionalDepthSystem.shouldShowRealLifeReminder()) {
          const reminder = EmotionalDepthSystem.getRealLifeReminder();
          setTimeout(() => {
            addChatMsg('system', `💡 ${reminder}`);
          }, 2000);
        }
      } catch (err) {
        console.error('[EmotionalDepth] 情感深度系统处理失败:', err);
      }
      
      // AI 原则系统：如果关系健康度变化，重新构建 system prompt
      try {
        if (behaviorResult && behaviorResult.healthChange !== 0) {
          updateSystemPrompt();
          const healthLevel = AIPrinciplesSystem.getHealthLevel();
          console.log('[AIPrinciples] 关系健康度:', healthLevel.value, healthLevel.label);
        }
      } catch (err) {
        console.error('[AIPrinciples] 系统更新失败:', err);
      }

      // 记忆系统：检测纠正和强化记忆
      try {
        // 检测用户是否在纠正 AI
        if (MemorySystem.detectCorrection(text)) {
          console.log('[Memory] 检测到用户纠正');
          
          // 查找最近被访问的记忆（可能是被记错的）
          const keyMemories = MemorySystem.getKeyMemory();
          if (keyMemories.length > 0) {
            // 简单策略：强化最近访问的记忆
            const lastMemory = keyMemories[keyMemories.length - 1];
            const correctedMemory = MemorySystem.handleCorrection(lastMemory, text);
            
            // 更新记忆
            keyMemories[keyMemories.length - 1] = correctedMemory;
            localStorage.setItem('ai-companion-key-memory', JSON.stringify(keyMemories));
            
            console.log('[Memory] 记忆已纠正并强化:', correctedMemory.content);
          }
        }
        
        // 检测重复提及（用户再次提到某个记忆）
        const keyMemories = MemorySystem.getKeyMemory();
        let memoryReinforced = false;
        for (let i = 0; i < keyMemories.length; i++) {
          const memory = keyMemories[i];
          // 简单匹配：如果用户消息包含记忆内容的关键词
          const keywords = memory.content.split(/[，。、\s]+/).filter(k => k.length > 1);
          if (keywords.some(k => text.includes(k))) {
            keyMemories[i] = MemorySystem.reinforceMemory(memory, 'repeat');
            memoryReinforced = true;
            console.log('[Memory] 记忆已强化（重复提及）:', memory.content);
            break; // 只强化第一个匹配的记忆
          }
        }
        
        if (memoryReinforced) {
          localStorage.setItem('ai-companion-key-memory', JSON.stringify(keyMemories));
        }
      } catch (err) {
        console.error('[Memory] 记忆处理失败:', err);
      }
    } catch (err) {
      console.error('API error:', err);
      if (err.name === 'AbortError') {
        addChatMsg('ai', '（回复超时了，请再试一次）');
      } else {
        addChatMsg('ai', '（网络错误，请检查 API 配置…）');
      }
      setEmotion('idle');
    }
    
    // 虚拟生理状态系统：处理互动消耗
    if (typeof PhysiologicalStateSystem !== 'undefined') {
      try {
        // 分析话题类型
        let topic = 'normal';
        if (text.match(/生气|愤怒|讨厌|烦人/i)) {
          topic = 'conflict';
        } else if (text.match(/难过|伤心|害怕|脆弱/i)) {
          topic = 'vulnerable';
        } else if (text.match(/开心|高兴|哈哈|喜欢/i)) {
          topic = 'joyful';
        } else if (text.length > 100 || text.match(/为什么|怎么|如何|什么/i)) {
          topic = 'deep';
        } else if (text.length < 20) {
          topic = 'casual';
        }
        
        PhysiologicalStateSystem.processInteraction({
          topic,
          emotionalIntensity: finalEmotion === 'idle' ? 3 : 7,
          duration: 1,
        });
        
        // 更新 UI 显示
        updatePhysiologicalStateUI();
        
        // 检查是否需要休息
        const modifiers = PhysiologicalStateSystem.getResponseModifiers();
        if (modifiers.needsRest) {
          const suggestions = PhysiologicalStateSystem.generateRestSuggestion();
          if (suggestions.length > 0 && suggestions[0].type === 'urgent') {
            // 严重疲劳时显示休息提示
            setTimeout(() => {
              addChatMsg('system', `💤 ${suggestions[0].message}`);
            }, 2000);
          }
        }
      } catch (err) {
        console.error('[PhysiologicalState] 互动处理失败:', err);
      }
    }

    isProcessing = false;
    $('#typing').classList.add('hidden');
  }

  async function callAPI(overrideMessages) {
    // 使用传入的消息或从 chatHistory 中截取（支持可配置的短期记忆条数）
    const limit = config.memory?.shortTermLimit || 20;
    const messages = overrideMessages || chatHistory.slice(-limit);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 秒超时
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: config.apiUrl, apiKey: config.apiKey, model: config.model, messages }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } finally {
      clearTimeout(timeout);
    }
  }

  // ============================
  // 情绪系统
  // ============================
  function parseEmotion(text) {
    // 兼容多种格式：[emotion:shy]、[shy]、[shy:害羞]、[emotion:shy:害羞]、[害羞]
    const match = text.match(/\[(?:emotion:\s*)?(\w+)(?::[^\]]*?)?\]/i);
    const raw = match ? match[1].toLowerCase() : '';
    let emotion = (raw && EMOTIONS.find(e => e.id === raw)) ? raw : 'idle';
    const clean = text.replace(/\[(?:emotion:\s*)?(\w+)(?::[^\]]*?)?\]/gi, '').trim();

    // 兜底：AI 没给标签时，从回复内容关键词推断情绪
    if (emotion === 'idle' && clean) {
      const inferred = inferEmotionFromText(clean);
      if (inferred) emotion = inferred;
    }

    return { clean, emotion };
  }

  // 从文本内容推断情绪（当 AI 不输出标签时的兜底）
  function inferEmotionFromText(text) {
    const rules = [
      { id: 'happy', re: /哈哈|嘻嘻|嘿嘿|太好了|好开心|高兴|笑|棒|喜欢|爱|耶|~|！{2}/ },
      { id: 'shy', re: /诶|那个...|谢谢夸奖|不好意思|脸红|害羞|唔|嗯...|别这样|哎呀/ },
      { id: 'embarrassed', re: /尴尬|呃|这...|那个|不知道说什么|冷场|汗/ },
      { id: 'sad', re: /难过|伤心|呜|唉|可惜|遗憾|寂寞|孤独|想哭|心疼/ },
      { id: 'angry', re: /哼|生气|讨厌|烦|气死|可恶|太过分了|不想理你/ },
      { id: 'surprised', re: /诶？！|哇|天哪|真的吗|不会吧|居然|竟然|吓了一跳/ },
      { id: 'thinking', re: /嗯...|让我想想|我想想|怎么说呢|这个嘛|考虑一下|也许/ },
    ];
    for (const r of rules) {
      if (r.re.test(text)) return r.id;
    }
    return null; // 无法推断，保持 idle
  }

  function setEmotion(emotion) {
    currentEmotion = emotion;
    const charEl = $('#character');
    charEl.setAttribute('data-emotion', emotion);

    // 立绘切换（与 BGM 淡出时间对齐，约 800ms）
    const imgEl = $('#char-base');
    const targetSrc = config.expressions[emotion] || config.image;
    if (imgEl._lastSrc !== targetSrc) {
      imgEl.style.opacity = '0';
      setTimeout(() => {
        imgEl.src = targetSrc;
        imgEl._lastSrc = targetSrc;
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
        if (imgEl.complete) imgEl.style.opacity = '1';
      }, 700);
    }

    spawnParticles(emotion);

    const tagEl = $('#emotion-tag');
    const labels = { idle:'平静', happy:'开心', shy:'害羞', embarrassed:'尴尬', sad:'难过', angry:'生气', surprised:'惊讶', thinking:'思考', talking:'说话中' };
    tagEl.textContent = labels[emotion] || emotion;
    tagEl.classList.remove('hidden');
    clearTimeout(tagEl._hideTimer);
    tagEl._hideTimer = setTimeout(() => tagEl.classList.add('hidden'), 2000);

    clearTimeout(charEl._idleTimer);
    if (emotion !== 'idle' && emotion !== 'talking') {
      charEl._idleTimer = setTimeout(() => {
        if (!isProcessing && currentEmotion === emotion) setEmotion('idle');
      }, 5000);
    }
  }

  function spawnParticles(emotion) {
    const c = { sparkles: $('#fx-sparkles'), hearts: $('#fx-hearts'), anger: $('#fx-anger') };
    c.sparkles.innerHTML = ''; c.hearts.innerHTML = ''; c.anger.innerHTML = '';
    if (emotion === 'happy' || emotion === 'surprised') {
      for (let i = 0; i < 10; i++) {
        const s = document.createElement('div');
        s.className = 'sparkle-particle';
        s.style.left = Math.random()*100+'%'; s.style.top = Math.random()*100+'%';
        s.style.setProperty('--dx',(Math.random()*60-30)+'px'); s.style.setProperty('--dy',(Math.random()*-50-10)+'px');
        s.style.animationDelay = Math.random()*0.6+'s';
        c.sparkles.appendChild(s);
      }
    }
    if (emotion === 'shy' || emotion === 'embarrassed') {
      for (let i = 0; i < 5; i++) {
        const h = document.createElement('div');
        h.className = 'heart-particle'; h.textContent = '💗';
        h.style.left = (20+Math.random()*60)+'%'; h.style.top = (30+Math.random()*40)+'%';
        h.style.animationDelay = Math.random()*0.8+'s';
        c.hearts.appendChild(h);
      }
    }
    if (emotion === 'angry') {
      for (let i = 0; i < 4; i++) {
        const m = document.createElement('div');
        m.className = 'anger-mark'; m.textContent = '💢';
        m.style.left = (15+Math.random()*70)+'%'; m.style.top = Math.random()*80+'%';
        m.style.animationDelay = Math.random()*0.3+'s';
        c.anger.appendChild(m);
      }
    }
  }

  // ============================
  // TTS 语音播放（支持 Edge TTS 和 Fish Audio + SSML 情感增强 + 重叠说话检测）
  // ============================
  function speakEdgeTTS(text, onReady, options = {}) {
    // 彻底停掉上一段语音
    if (currentAudio) {
      // 通知重叠说话系统：AI 停止说话
      if (typeof OverlapSpeechSystem !== 'undefined') {
        OverlapSpeechSystem.onAISpeakEnd('interrupted');
      }
      
      currentAudio.pause();
      currentAudio.onplay = null;
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.src = '';
      currentAudio = null;
    }

    // 获取当前声线配置
    const voiceConfig = TTS_VOICES.find(v => v.id === config.ttsVoice);
    
    // 提取纯文本（移除情感标记和动作描述）
    let plainText = text;
    if (typeof SSMLEmotionSystem !== 'undefined') {
      plainText = SSMLEmotionSystem.extractPlainText(text);
    }
    
    const audio = new Audio();
    
    // 根据声线类型构建 URL
    if (voiceConfig?.type === 'fish') {
      // Fish Audio（不支持 SSML）
      audio.src = `/api/tts?text=${encodeURIComponent(plainText.slice(0, 300))}&fish=true&referenceId=${encodeURIComponent(voiceConfig.referenceId)}&_t=${Date.now()}`;
      console.log('[TTS] 使用 Fish Audio（不支持 SSML）');
    } else {
      // Edge TTS（支持 SSML）
      const useSSML = typeof SSMLEmotionSystem !== 'undefined';
      
      if (useSSML) {
        // 生成 SSML
        const physiologicalState = typeof PhysiologicalStateSystem !== 'undefined' 
          ? PhysiologicalStateSystem.getState() 
          : null;
        
        const ssmlText = SSMLEmotionSystem.generateSSML(plainText, {
          emotion: currentEmotion,
          physiologicalState: physiologicalState,
          voiceType: 'edge',
          addBreathing: true,
          addProsody: true,
        });
        
        audio.src = `/api/tts?text=${encodeURIComponent(ssmlText.slice(0, 1000))}&voice=${encodeURIComponent(config.ttsVoice)}&ssml=true&_t=${Date.now()}`;
        console.log('[TTS] 使用 Edge TTS + SSML 情感增强');
      } else {
        // 不使用 SSML，使用传统的 rate 和 pitch
        const rate = voiceConfig?.rate || '+0%';
        const pitch = voiceConfig?.pitch || '+0Hz';
        audio.src = `/api/tts?text=${encodeURIComponent(plainText.slice(0, 300))}&voice=${encodeURIComponent(config.ttsVoice)}&rate=${encodeURIComponent(rate)}&pitch=${encodeURIComponent(pitch)}&_t=${Date.now()}`;
        console.log('[TTS] 使用 Edge TTS（无 SSML）');
      }
    }
    
    audio.volume = 1;
    audio.preload = 'auto'; // 预加载

    // 立即尝试播放，不等 oncanplaythrough
    audio.play().then(() => {
      audioUnlocked = true;
      $('#character').classList.add('is-speaking');
      
      // 通知重叠说话系统：AI 开始说话
      if (typeof OverlapSpeechSystem !== 'undefined') {
        OverlapSpeechSystem.onAISpeakStart(plainText);
      }
      
      if (onReady) onReady();
    }).catch(() => {
      // 播放失败，等待加载完成后重试
      audio.oncanplaythrough = () => {
        audio.play().then(() => {
          audioUnlocked = true;
          $('#character').classList.add('is-speaking');
          
          // 通知重叠说话系统：AI 开始说话
          if (typeof OverlapSpeechSystem !== 'undefined') {
            OverlapSpeechSystem.onAISpeakStart(plainText);
          }
          
          if (onReady) onReady();
        }).catch(() => {});
      };
    });

    audio.onended = () => {
      // 通知重叠说话系统：AI 停止说话
      if (typeof OverlapSpeechSystem !== 'undefined') {
        OverlapSpeechSystem.onAISpeakEnd('natural');
      }
      
      currentAudio = null;
      $('#character').classList.remove('is-speaking');
      // 语音播完，立绘回归平静
      if (currentEmotion !== 'idle') setEmotion('idle');
    };
    audio.onerror = () => {
      // 通知重叠说话系统：AI 停止说话
      if (typeof OverlapSpeechSystem !== 'undefined') {
        OverlapSpeechSystem.onAISpeakEnd('error');
      }
      
      currentAudio = null;
      $('#character').classList.remove('is-speaking');
      if (currentEmotion !== 'idle') setEmotion('idle');
      if (onReady) onReady();
    };

    currentAudio = audio;
  }

  // ============================
  // BGM（服务器端文件，可靠播放）
  // Bug3 修复：通话开始即播放 idle BGM
  // Bug4 修复：暂停/恢复支持断点续播，复用 Audio 实例
  // ============================
  function getOrCreateBgmAudio(mood) {
    if (bgmAudioPool[mood]) return bgmAudioPool[mood];
    const track = config.bgm[mood];
    if (!track) return null;
    const audio = new Audio(track.url);
    audio.loop = true;
    audio.volume = config.bgmVolume || 0.25;
    audio.preload = 'auto';
    bgmAudioPool[mood] = audio;
    return audio;
  }

  function playBGM(mood) {
    const track = config.bgm[mood];
    if (!track) return;

    const targetAudio = getOrCreateBgmAudio(mood);
    if (!targetAudio) return;

    // 如果当前有 BGM 在播放，先淡出
    if (bgmAudio && bgmAudio !== targetAudio) {
      fadeAudio(bgmAudio, 0, 800, () => {
        bgmAudio.pause();
        startBGMPlayback(targetAudio, mood, track);
      });
    } else {
      startBGMPlayback(targetAudio, mood, track);
    }
    currentBgmMood = mood;
  }

  function startBGMPlayback(audio, mood, track) {
    // Bug4：如果有暂停位置，从断点续播
    if (audio._pausedAt && audio._pausedAt > 0) {
      audio.currentTime = audio._pausedAt;
      audio._pausedAt = 0;
    }
    audio.volume = 0;
    bgmAudio = audio;
    audio.play().then(() => {
      // 淡入
      fadeAudio(audio, config.bgmVolume || 0.25, 600);
      $('#bgm-name').textContent = track.name.replace(/\.[^.]+$/, '');
    }).catch((e) => {
      console.warn('[BGM] autoplay blocked, waiting for user interaction');
      bgmAudio = audio;
      const retry = () => {
        audio.currentTime = audio._pausedAt || 0;
        audio._pausedAt = 0;
        audio.play().then(() => {
          fadeAudio(audio, config.bgmVolume || 0.25, 600);
          $('#bgm-name').textContent = track.name.replace(/\.[^.]+$/, '');
        }).catch(() => {});
        document.removeEventListener('click', retry);
        document.removeEventListener('touchstart', retry);
      };
      document.addEventListener('click', retry, { once: true });
      document.addEventListener('touchstart', retry, { once: true });
    });
  }

  function pauseBGM() {
    if (!bgmAudio) return;
    // Bug4：记录暂停位置
    bgmAudio._pausedAt = bgmAudio.currentTime;
    fadeAudio(bgmAudio, 0, 500, () => { bgmAudio.pause(); });
  }

  function resumeBGM() {
    if (!currentBgmMood) return;
    const track = config.bgm[currentBgmMood];
    if (!track) return;
    const audio = getOrCreateBgmAudio(currentBgmMood);
    if (!audio) return;
    startBGMPlayback(audio, currentBgmMood, track);
  }

  function stopBGM() {
    if (bgmAudio) {
      bgmAudio._pausedAt = 0; // 停止时清除暂停位置
      fadeAudio(bgmAudio, 0, 500, () => { bgmAudio.pause(); bgmAudio.currentTime = 0; bgmAudio = null; });
    }
  }

  function switchBGM(newMood) {
    if (!config.bgmEnabled || newMood === currentBgmMood) return;
    // 只在有对应 mood 的 BGM 时才切换，否则保持当前 BGM 不变
    if (config.bgm[newMood]) {
      playBGM(newMood);
    }
    // 如果当前没有 BGM 在播放，且有 idle BGM，则播放 idle
    else if (!currentBgmMood && config.bgm['idle']) {
      playBGM('idle');
    }
  }

  function fadeAudio(audio, targetVol, durationMs, onDone) {
    const startVol = audio.volume;
    const diff = targetVol - startVol;
    const steps = Math.max(1, Math.floor(durationMs / 50));
    let step = 0;
    const iv = setInterval(() => {
      step++;
      audio.volume = Math.max(0, Math.min(1, startVol + diff * (step / steps)));
      if (step >= steps) { clearInterval(iv); if (onDone) onDone(); }
    }, 50);
  }

  // ============================
  // 气泡 / 聊天
  // ============================
  function showBubble(text) {
    const el = $('#speech-bubble');
    $('#bubble-text').textContent = text;
    el.classList.remove('hidden');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.add('hidden'), Math.max(3000, text.length * 350));
  }

  function addChatMsg(role, text) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    if (role === 'system') {
      // 动作描述等系统消息，用斜体灰色显示
      div.innerHTML = `<em>${text}</em>`;
      div.style.color = '#888';
      div.style.fontSize = '0.9em';
    } else {
      div.textContent = text;
    }
    $('#chat-messages').appendChild(div);
    $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
  }

  // ============================
  // 语音识别
  // ============================
  function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { $('#btn-mic').title = '浏览器不支持'; $('#btn-mic').style.opacity = '.3'; return; }
    recognition = new SR();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;  // 启用中间结果以检测说话开始
    
    // 检测用户开始说话（中间结果）
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      
      // 检测用户开始说话时打断 AI
      if (typeof OverlapSpeechSystem !== 'undefined' && OverlapSpeechSystem.isAISpeaking()) {
        OverlapSpeechSystem.onUserInterrupt('speech');
        stopAISpeech();  // 停止 AI 语音
      }
      
      // 最终结果
      if (e.results[0].isFinal) {
        $('#msg-input').value = transcript; 
        stopMic(); 
        sendMessage();
      }
    };
    
    recognition.onerror = () => stopMic();
    recognition.onend = () => stopMic();
  }

  function toggleMic() {
    if (!recognition) return;
    if ($('#btn-mic').classList.contains('recording')) { 
      recognition.stop(); 
      stopMic(); 
    }
    else { 
      // 用户点击麦克风 → 检测是否打断 AI
      if (typeof OverlapSpeechSystem !== 'undefined' && OverlapSpeechSystem.isAISpeaking()) {
        OverlapSpeechSystem.onUserInterrupt('mic');
        stopAISpeech();  // 停止 AI 语音
      }
      
      try { 
        recognition.start(); 
        $('#btn-mic').classList.add('recording'); 
      } catch {} 
    }
  }
  function stopMic() { $('#btn-mic').classList.remove('recording'); }

  // ============================
  // 记忆管理 UI
  // ============================
  function populateMemorySettings() {
    // 填充配置值
    $('#s-memory-short-term').value = config.memory?.shortTermLimit || 50;
    $('#s-memory-summary-count').value = config.memory?.summaryLimit || 5;

    // 渲染摘要列表
    const summaryList = $('#memory-summary-list');
    summaryList.innerHTML = '';
    const summaries = MemorySystem.getSummaries();
    if (summaries.length === 0) {
      summaryList.innerHTML = '<div class="memory-empty">暂无对话摘要（结束通话后自动生成）</div>';
    } else {
      // 按时间倒序显示
      [...summaries].reverse().forEach((s, i) => {
        const el = document.createElement('div');
        el.className = 'memory-item';
        el.innerHTML = `<span class="memory-date">${s.date}</span><span class="memory-text">${escapeHtml(s.summary)}</span>`;
        summaryList.appendChild(el);
      });
    }
    $('#memory-summary-count').textContent = `${summaries.length} 条`;

    // 渲染关键记忆列表
    const keyList = $('#memory-key-list');
    keyList.innerHTML = '';
    let keyMemories = MemorySystem.getKeyMemory();
    if (keyMemories.length === 0) {
      keyList.innerHTML = '<div class="memory-empty">暂无关键记忆（结束通话后自动提取）</div>';
    } else {
      // 应用衰减并按权重排序
      keyMemories = keyMemories.map(m => ({
        ...m,
        weight: MemorySystem.applyDecay(m),
      })).sort((a, b) => (b.weight || 0) - (a.weight || 0));
      
      keyMemories.forEach((m, i) => {
        const el = document.createElement('div');
        el.className = 'memory-item';
        
        // 类型标签
        const typeLabel = { 
          preference: '🎯 偏好', 
          event: '📅 事件', 
          promise: '🤝 承诺', 
          fact: '📝 事实' 
        };
        
        // 重要性标签
        const importanceLabel = {
          critical: '🔥 永久',
          high: '⭐ 重要',
          medium: '📌 普通',
          low: '💭 淡忘',
        };
        const importance = importanceLabel[m.importance] || '📌';
        
        // 权重
        const weight = Math.round(m.weight || 50);
        
        // 权重颜色
        let weightColor = '#888';
        if (weight >= 80) weightColor = '#4caf50'; // 绿色
        else if (weight >= 50) weightColor = '#2196f3'; // 蓝色
        else if (weight >= 30) weightColor = '#ff9800'; // 橙色
        else weightColor = '#f44336'; // 红色
        
        // 纠正次数
        const correctedBadge = (m.correctedCount || 0) > 0 
          ? `<span class="memory-corrected" title="被纠正${m.correctedCount}次">✓${m.correctedCount}</span>` 
          : '';
        
        el.innerHTML = `
          <div class="memory-header">
            <span class="memory-type">${typeLabel[m.type] || m.type}</span>
            <span class="memory-importance">${importance}</span>
            <span class="memory-weight" style="color: ${weightColor}">权重 ${weight}</span>
            ${correctedBadge}
          </div>
          <span class="memory-text">${escapeHtml(m.content)}</span>
          <div class="memory-progress">
            <div class="memory-progress-bar" style="width: ${weight}%; background: ${weightColor}"></div>
          </div>
          <button class="memory-delete" data-index="${i}" title="删除">✕</button>
        `;
        el.querySelector('.memory-delete').addEventListener('click', () => {
          MemorySystem.removeKeyMemory(i);
          populateMemorySettings(); // 刷新列表
        });
        keyList.appendChild(el);
      });
    }
    $('#memory-key-count').textContent = `${keyMemories.length} 条`;
  }

  /** HTML 转义 */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================
  // 情感深度统计 UI
  // ============================
  function populateEmotionalDepthStats() {
    try {
      const state = EmotionalDepthSystem.getState();
      const levelName = EmotionalDepthSystem.getLevelName();
      
      // 计算相处天数
      let days = 0;
      if (state.firstInteractionDate) {
        const now = new Date();
        const first = new Date(state.firstInteractionDate);
        const diff = now - first;
        days = Math.floor(diff / (1000 * 60 * 60 * 24));
      }
      
      // 更新显示
      $('#emotional-level').textContent = levelName;
      $('#emotional-days').textContent = `${days} 天`;
      $('#emotional-interactions').textContent = `${state.interactions || 0} 次`;
      $('#emotional-shared').textContent = `${state.sharedEmotions || 0} 次`;
      $('#emotional-vulnerable').textContent = `${state.vulnerableMoments || 0} 次`;
      $('#emotional-care').textContent = `${state.mutualCare || 0} 次`;
    } catch (err) {
      console.error('[EmotionalDepth] 统计显示失败:', err);
    }
  }

  // ============================
  // AI 原则统计 UI
  // ============================
  function populatePrinciplesStats() {
    try {
      const state = AIPrinciplesSystem.getState();
      const healthLevel = AIPrinciplesSystem.getHealthLevel();
      
      // 更新显示
      $('#principles-health').textContent = `${state.relationshipHealth}/100`;
      $('#principles-level').textContent = `${healthLevel.label} ${healthLevel.emoji}`;
      $('#principles-negative').textContent = `${state.negativeCount || 0} 次`;
      $('#principles-positive').textContent = `${state.positiveCount || 0} 次`;
      $('#principles-conflicts').textContent = `${state.conflictHistory?.length || 0} 次`;
      $('#principles-reconciliations').textContent = `${state.reconciliationHistory?.length || 0} 次`;
    } catch (err) {
      console.error('[AIPrinciples] 统计显示失败:', err);
    }
  }

  // ============================
  // 人格一致性统计 UI
  // ============================
  function populatePersonalityStats() {
    try {
      const state = PersonalityConsistencySystem.getState();
      const { emotional } = state.dynamicTraits;
      const { relationship, selfAwareness } = state;
      
      // 计算相识天数
      let days = 0;
      if (state.createdAt) {
        const now = new Date();
        const created = new Date(state.createdAt);
        const diff = now - created;
        days = Math.floor(diff / (1000 * 60 * 60 * 24));
      }
      
      // 更新基础统计
      $('#personality-relationship').textContent = selfAwareness.currentRelationship || '陌生人';
      $('#personality-days').textContent = `${days} 天`;
      $('#personality-intimacy').textContent = `${(emotional.intimacyLevel * 100).toFixed(0)}%`;
      $('#personality-trust').textContent = `${(emotional.trustLevel * 100).toFixed(0)}%`;
      $('#personality-openness').textContent = `${(emotional.opennessLevel * 100).toFixed(0)}%`;
      $('#personality-milestones').textContent = `${relationship.milestones?.length || 0} 个`;
      $('#personality-jokes').textContent = `${relationship.insideJokes?.length || 0} 个`;
      
      // 更新计数器
      $('#personality-milestones-count').textContent = relationship.milestones?.length || 0;
      $('#personality-jokes-count').textContent = relationship.insideJokes?.length || 0;
      
      // 更新重要时刻列表
      const milestonesList = $('#personality-milestones-list');
      milestonesList.innerHTML = '';
      if (relationship.milestones && relationship.milestones.length > 0) {
        // 显示最近 10 个里程碑
        const recentMilestones = relationship.milestones.slice(-10).reverse();
        for (const milestone of recentMilestones) {
          const item = document.createElement('div');
          item.className = 'memory-item';
          const date = new Date(milestone.date).toLocaleDateString('zh-CN');
          const emotionEmoji = milestone.emotion === 'happy' ? '😊' :
                               milestone.emotion === 'sad' ? '😢' :
                               milestone.emotion === 'surprised' ? '😲' :
                               milestone.emotion === 'angry' ? '😠' : '💭';
          item.innerHTML = `
            <div class="memory-text">${emotionEmoji} ${milestone.title}</div>
            <div class="memory-meta">${date} · ${milestone.story || ''}</div>
          `;
          milestonesList.appendChild(item);
        }
      } else {
        milestonesList.innerHTML = '<div class="hint-text">还没有重要时刻</div>';
      }
      
      // 更新内部笑话列表
      const jokesList = $('#personality-jokes-list');
      jokesList.innerHTML = '';
      if (relationship.insideJokes && relationship.insideJokes.length > 0) {
        for (const joke of relationship.insideJokes) {
          const item = document.createElement('div');
          item.className = 'memory-item';
          const firstUsed = new Date(joke.firstUsed).toLocaleDateString('zh-CN');
          item.innerHTML = `
            <div class="memory-text">😄 "${joke.phrase}"</div>
            <div class="memory-meta">${joke.meaning || ''} · 用过 ${joke.timesUsed || 1} 次 · ${firstUsed}</div>
          `;
          jokesList.appendChild(item);
        }
      } else {
        jokesList.innerHTML = '<div class="hint-text">还没有内部笑话</div>';
      }
    } catch (err) {
      console.error('[PersonalityConsistency] 统计显示失败:', err);
    }
  }

  // ============================
  // 防沉迷统计 UI
  // ============================
  function populateAntiAddictionStats() {
    try {
      const state = AntiAddictionSystem.getState();
      const { today, currentSession, statistics, week } = state;
      
      // 更新基础统计
      $('#antiaddiction-today').textContent = AntiAddictionSystem.formatMinutes(today.totalMinutes);
      $('#antiaddiction-session').textContent = AntiAddictionSystem.formatMinutes(currentSession.elapsedMinutes);
      
      // 计算健康度
      const healthScore = AntiAddictionSystem.calculateHealthScore(today.totalMinutes);
      const healthLevel = AntiAddictionSystem.getHealthLevel(healthScore);
      $('#antiaddiction-health').textContent = `${healthScore}/100 ${healthLevel.emoji}`;
      
      $('#antiaddiction-sessions').textContent = `${statistics.totalSessions} 次`;
      $('#antiaddiction-longest').textContent = AntiAddictionSystem.formatMinutes(statistics.longestSession);
      
      // 计算本周累计
      const weekTotal = Object.values(week).reduce((sum, day) => sum + day.totalMinutes, 0);
      $('#antiaddiction-week').textContent = AntiAddictionSystem.formatMinutes(weekTotal);
      
      // 更新健康建议
      const suggestions = AntiAddictionSystem.getHealthSuggestions();
      const suggestionsList = $('#antiaddiction-suggestions');
      suggestionsList.innerHTML = '';
      if (suggestions.length > 0) {
        for (const suggestion of suggestions) {
          const item = document.createElement('div');
          item.className = 'memory-item';
          item.innerHTML = `<div class="memory-text">💡 ${suggestion}</div>`;
          suggestionsList.appendChild(item);
        }
      } else {
        suggestionsList.innerHTML = '<div class="hint-text">暂无建议</div>';
      }
      
      // 更新偏好设置
      $('#antiaddiction-reminder-enabled').checked = state.preferences.reminderEnabled;
      $('#antiaddiction-sleep-enabled').checked = state.preferences.sleepProtectionEnabled;
    } catch (err) {
      console.error('[AntiAddiction] 统计显示失败:', err);
    }
  }

  // ============================
  // 使用时长显示更新
  // ============================
  function updateUsageDisplay() {
    try {
      const state = AntiAddictionSystem.getState();
      const minutes = state.currentSession.elapsedMinutes;
      
      // 更新状态栏显示
      if ($('#usage-time')) {
        $('#usage-time').textContent = `⏱️ ${minutes} 分钟`;
        
        // 根据时长改变颜色
        if (minutes >= 120) {
          $('#usage-time').style.color = '#f44336'; // 红色
        } else if (minutes >= 90) {
          $('#usage-time').style.color = '#ff9800'; // 橙色
        } else if (minutes >= 60) {
          $('#usage-time').style.color = '#ffeb3b'; // 黄色
        } else {
          $('#usage-time').style.color = ''; // 默认
        }
      }
    } catch (err) {
      console.error('[AntiAddiction] 更新显示失败:', err);
    }
  }

  // ============================
  // 使用时长提醒处理
  // ============================
  function handleUsageReminder(reminder) {
    console.log('[AntiAddiction] 使用时长提醒:', reminder.type, reminder.minutes, '分钟');
    
    // 显示提醒消息
    addChatMsg('system', `⏱️ ${reminder.message}`);
    
    // 严重提醒时显示弹窗
    if (reminder.severity === 'critical' || reminder.severity === 'urgent') {
      showReminderModal(reminder);
    }
  }

  // ============================
  // 睡眠提醒处理
  // ============================
  function handleSleepReminder(reminder) {
    console.log('[AntiAddiction] 睡眠提醒:', reminder.type, `${reminder.hour}:${reminder.minute}`);
    
    // 显示提醒消息
    addChatMsg('system', `🌙 ${reminder.message}`);
    
    // 深夜强烈提醒时显示弹窗
    if (reminder.severity === 'critical') {
      showSleepReminderModal(reminder);
    }
  }

  // ============================
  // 提醒弹窗
  // ============================
  function showReminderModal(reminder) {
    // 简单实现：使用系统消息 + 控制台日志
    // 可以扩展为自定义弹窗
    console.warn('[AntiAddiction] ⚠️ 使用时长提醒:', reminder.message);
    addChatMsg('system', `⚠️ 温馨提醒：你已经使用了 ${reminder.minutes} 分钟，建议休息一下哦 💚`);
  }

  function showSleepReminderModal(reminder) {
    // 简单实现：使用系统消息 + 控制台日志
    // 可以扩展为自定义弹窗
    console.warn('[AntiAddiction] 🌙 睡眠提醒:', reminder.message);
    addChatMsg('system', `🌙 深夜提醒：现在是凌晨 ${reminder.hour} 点了，真的该睡觉了！你的健康很重要 💚`);
  }

  // ============================
  // 虚拟生理状态 UI 更新
  // ============================
  
  /**
   * 更新生理状态 UI（状态栏显示）
   */
  function updatePhysiologicalStateUI() {
    if (typeof PhysiologicalStateSystem === 'undefined') return;
    
    try {
      const summary = PhysiologicalStateSystem.getStateSummary();
      const statusEl = $('#physiological-status');
      
      if (statusEl) {
        // 根据精力值选择图标和颜色
        let icon = '💡';
        let title = '精力充沛';
        
        if (summary.energy.value > 70) {
          icon = '⚡';
          title = `精力充沛 (${summary.energy.value.toFixed(0)}%)`;
        } else if (summary.energy.value > 40) {
          icon = '💡';
          title = `状态正常 (${summary.energy.value.toFixed(0)}%)`;
        } else if (summary.energy.value > 20) {
          icon = '😴';
          title = `有些疲惫 (${summary.energy.value.toFixed(0)}%)`;
        } else {
          icon = '💤';
          title = `非常疲惫 (${summary.energy.value.toFixed(0)}%)`;
        }
        
        statusEl.textContent = icon;
        statusEl.title = title;
        statusEl.style.color = summary.energy.color;
      }
    } catch (err) {
      console.error('[PhysiologicalState] UI 更新失败:', err);
    }
  }
  
  /**
   * 填充生理状态统计（设置面板）
   */
  function populatePhysiologicalStats() {
    if (typeof PhysiologicalStateSystem === 'undefined') return;
    
    try {
      const summary = PhysiologicalStateSystem.getStateSummary();
      const state = PhysiologicalStateSystem.getState();
      
      // 精力值
      const energyEl = $('#physio-energy');
      if (energyEl) {
        const icon = summary.energy.value > 70 ? '⚡' : 
                     summary.energy.value > 40 ? '💡' : 
                     summary.energy.value > 20 ? '😴' : '💤';
        energyEl.textContent = `${summary.energy.value.toFixed(0)}/100 ${icon}`;
        energyEl.style.color = summary.energy.color;
      }
      
      // 心情
      const moodEl = $('#physio-mood');
      if (moodEl) {
        moodEl.textContent = `${summary.mood.value.toFixed(0)}/100 ${summary.mood.emoji}`;
      }
      
      // 压力值
      const stressEl = $('#physio-stress');
      if (stressEl) {
        const icon = summary.stress.value < 30 ? '😌' :
                     summary.stress.value < 60 ? '😐' :
                     summary.stress.value < 80 ? '😰' : '😱';
        stressEl.textContent = `${summary.stress.value.toFixed(0)}/100 ${icon}`;
        stressEl.style.color = summary.stress.color;
      }
      
      // 社交电量
      const socialEl = $('#physio-social');
      if (socialEl) {
        socialEl.textContent = `${summary.socialBattery.value.toFixed(0)}/100 ${summary.socialBattery.level}`;
      }
      
      // 情绪容量
      const emotionalEl = $('#physio-emotional');
      if (emotionalEl) {
        emotionalEl.textContent = `${state.emotionalCapacity.toFixed(0)}/100`;
      }
      
      // 清醒时长
      const awakeEl = $('#physio-awake');
      if (awakeEl) {
        const hours = summary.awakeDuration.hours;
        const warning = summary.awakeDuration.warning ? ' ⚠️' : '';
        awakeEl.textContent = `${hours} 小时${warning}`;
        if (summary.awakeDuration.warning) {
          awakeEl.style.color = '#ff9800';
        } else {
          awakeEl.style.color = '';
        }
      }
      
      // 当前状态
      const levelEl = $('#physio-level');
      if (levelEl) {
        const icon = summary.energy.value > 70 ? '✨' :
                     summary.energy.value > 40 ? '💫' :
                     summary.energy.value > 20 ? '😓' : '😵‍💫';
        levelEl.textContent = `${summary.energy.level} ${icon}`;
      }
    } catch (err) {
      console.error('[PhysiologicalState] 统计显示失败:', err);
    }
  }

  /**
   * 填充重叠说话统计（设置面板）
   */
  function populateOverlapSpeechStats() {
    if (typeof OverlapSpeechVisual === 'undefined') return;
    
    try {
      // 更新统计数据
      OverlapSpeechVisual.updateStatisticsPanel();
      
      // 更新历史时间线
      OverlapSpeechVisual.updateHistoryTimeline();
      
      console.log('[OverlapSpeech] 统计面板已更新');
    } catch (err) {
      console.error('[OverlapSpeech] 统计显示失败:', err);
    }
  }

  // ============================
  // 设置弹窗
  // ============================
  function populateSettings() {
    $('#s-name').value = config.name;
    $('#s-personality').value = config.personality;
    $('#s-api-url').value = config.apiUrl;
    $('#s-api-key').value = config.apiKey;
    $('#s-model').value = config.model;
    const sel = $('#s-tts-voice');
    sel.innerHTML = '';
    TTS_VOICES.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id; opt.textContent = `${v.name} — ${v.desc}`;
      if (v.id === config.ttsVoice) opt.selected = true;
      sel.appendChild(opt);
    });

    // 记忆管理 UI
    populateMemorySettings();
    
    // 情感深度统计 UI
    populateEmotionalDepthStats();
    
    // AI 原则统计 UI
    populatePrinciplesStats();
    
    // 人格一致性统计 UI
    populatePersonalityStats();
    
    // 防沉迷统计 UI
    populateAntiAddictionStats();
    
    // 虚拟生理状态统计 UI
    populatePhysiologicalStats();
    
    // 重叠说话统计 UI
    populateOverlapSpeechStats();
  }

  function bindSettings() {
    $('#s-save').addEventListener('click', () => {
      config.name = $('#s-name').value.trim() || '小雪';
      config.personality = $('#s-personality').value.trim();
      config.apiUrl = $('#s-api-url').value.trim();
      config.apiKey = $('#s-api-key').value.trim();
      config.model = $('#s-model').value.trim();
      config.ttsVoice = $('#s-tts-voice').value;
      // 记忆配置
      config.memory.shortTermLimit = parseInt($('#s-memory-short-term').value) || 50;
      config.memory.summaryLimit = parseInt($('#s-memory-summary-count').value) || 5;
      $('#char-name').textContent = config.name;
      updateSystemPrompt();
      saveConfig();
      $('#modal-settings').classList.add('hidden');
    });

    // 记忆管理：清空按钮
    $('#memory-clear-summaries')?.addEventListener('click', () => {
      if (!confirm('确定要清空所有对话摘要吗？')) return;
      MemorySystem.clearSummaries();
      populateMemorySettings();
    });
    $('#memory-clear-keys')?.addEventListener('click', () => {
      if (!confirm('确定要清空所有关键记忆吗？')) return;
      MemorySystem.clearKeyMemory();
      populateMemorySettings();
    });
    
    // 情感深度：重置按钮
    $('#emotional-reset')?.addEventListener('click', () => {
      if (!confirm('确定要重置情感深度系统吗？这将清空所有情感深度数据。')) return;
      try {
        EmotionalDepthSystem.resetState();
        populateEmotionalDepthStats();
        // 重新构建 system prompt
        if (chatHistory.length > 0) {
          updateSystemPrompt();
        }
        alert('情感深度系统已重置');
      } catch (err) {
        console.error('[EmotionalDepth] 重置失败:', err);
        alert('重置失败: ' + err.message);
      }
    });
    
    // AI 原则：重置按钮
    $('#principles-reset')?.addEventListener('click', () => {
      if (!confirm('确定要重置 AI 原则系统吗？这将清空所有关系健康度数据。')) return;
      try {
        AIPrinciplesSystem.resetState();
        populatePrinciplesStats();
        // 重新构建 system prompt
        if (chatHistory.length > 0) {
          updateSystemPrompt();
        }
        alert('AI 原则系统已重置');
      } catch (err) {
        console.error('[AIPrinciples] 重置失败:', err);
        alert('重置失败: ' + err.message);
      }
    });
    
    // 人格一致性：重置按钮
    $('#personality-reset')?.addEventListener('click', () => {
      if (!confirm('确定要重置人格一致性系统吗？这将清空所有成长记录、关系升级、内部笑话等数据。')) return;
      try {
        PersonalityConsistencySystem.resetState();
        populatePersonalityStats();
        // 重新构建 system prompt
        if (chatHistory.length > 0) {
          updateSystemPrompt();
        }
        alert('人格一致性系统已重置');
      } catch (err) {
        console.error('[PersonalityConsistency] 重置失败:', err);
        alert('重置失败: ' + err.message);
      }
    });
    
    // 防沉迷：重置按钮
    $('#antiaddiction-reset')?.addEventListener('click', () => {
      if (!confirm('确定要重置使用数据吗？这将清空所有使用统计和记录。')) return;
      try {
        AntiAddictionSystem.resetState();
        populateAntiAddictionStats();
        alert('使用数据已重置');
      } catch (err) {
        console.error('[AntiAddiction] 重置失败:', err);
        alert('重置失败: ' + err.message);
      }
    });
    
    // 防沉迷：偏好设置
    $('#antiaddiction-reminder-enabled')?.addEventListener('change', (e) => {
      const state = AntiAddictionSystem.getState();
      state.preferences.reminderEnabled = e.target.checked;
      localStorage.setItem('ai-companion-anti-addiction', JSON.stringify(state));
      console.log('[AntiAddiction] 使用时长提醒:', e.target.checked ? '已启用' : '已禁用');
    });
    
    $('#antiaddiction-sleep-enabled')?.addEventListener('change', (e) => {
      const state = AntiAddictionSystem.getState();
      state.preferences.sleepProtectionEnabled = e.target.checked;
      localStorage.setItem('ai-companion-anti-addiction', JSON.stringify(state));
      console.log('[AntiAddiction] 睡眠保护:', e.target.checked ? '已启用' : '已禁用');
    });
    
    // 记忆导出：导出按钮
    $('#btn-export-memory')?.addEventListener('click', () => {
      handleExport();
    });
    
    // 记忆导出：导入按钮
    $('#btn-import-memory')?.addEventListener('click', () => {
      $('#import-file-input').click();
    });
    
    $('#import-file-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImport(file);
        // 清空文件输入，允许重复选择同一文件
        e.target.value = '';
      }
    });
    
    // 虚拟生理状态：休息按钮
    $('#physio-rest')?.addEventListener('click', () => {
      if (typeof PhysiologicalStateSystem !== 'undefined') {
        PhysiologicalStateSystem.rest(60);
        updatePhysiologicalStateUI();
        populatePhysiologicalStats();
        alert('已休息 1 小时，精力恢复了！');
      }
    });
    
    // 虚拟生理状态：睡眠按钮
    $('#physio-sleep')?.addEventListener('click', () => {
      if (typeof PhysiologicalStateSystem !== 'undefined') {
        PhysiologicalStateSystem.sleep(100);
        updatePhysiologicalStateUI();
        populatePhysiologicalStats();
        alert('睡了一觉，精力完全恢复了！');
      }
    });
    
    // 虚拟生理状态：独处充电按钮
    $('#physio-solitude')?.addEventListener('click', () => {
      if (typeof PhysiologicalStateSystem !== 'undefined') {
        PhysiologicalStateSystem.solitude(30);
        updatePhysiologicalStateUI();
        populatePhysiologicalStats();
        alert('独处充电 30 分钟，社交电量恢复了！');
      }
    });
    
    // 虚拟生理状态：重置按钮
    $('#physio-reset')?.addEventListener('click', () => {
      if (!confirm('确定要重置生理状态吗？这将恢复所有状态到初始值。')) return;
      if (typeof PhysiologicalStateSystem !== 'undefined') {
        PhysiologicalStateSystem.resetState();
        updatePhysiologicalStateUI();
        populatePhysiologicalStats();
        // 重新构建 system prompt
        if (chatHistory.length > 0) {
          updateSystemPrompt();
        }
        alert('生理状态已重置');
      }
    });
    
    // 重叠说话：清空历史按钮
    $('#overlap-clear-history')?.addEventListener('click', () => {
      if (!confirm('确定要清空所有打断历史吗？')) return;
      if (typeof OverlapSpeechSystem !== 'undefined') {
        OverlapSpeechSystem.clearHistory();
        populateOverlapSpeechStats();
        alert('打断历史已清空');
      }
    });
  }

  // ============================
  // 记忆导出与导入
  // ============================
  
  /**
   * 导出所有数据
   */
  function handleExport() {
    try {
      console.log('[Export] 开始导出...');
      
      const excludeApiKey = $('#export-exclude-api')?.checked ?? true;
      
      const result = MemoryExportSystem.exportToFile({
        excludeApiKey,
        includeConfig: true,
        includeMemory: true,
        includeAffection: true,
        includeEmotionalDepth: true,
        includePrinciples: true,
        includePersonality: true,
        includeAntiAddiction: true,
      });
      
      if (result.success) {
        console.log('[Export] 导出成功:', result.fileName);
        
        // 显示导出摘要
        const summary = result.summary;
        let summaryText = `✅ 导出成功！\n\n`;
        summaryText += `文件名：${result.fileName}\n`;
        summaryText += `文件大小：${result.fileSize} KB\n\n`;
        summaryText += `导出内容：\n`;
        summary.items.forEach(item => {
          if (item.count !== undefined) {
            summaryText += `${item.icon} ${item.name}：${item.count} 条\n`;
          } else if (item.value) {
            summaryText += `${item.icon} ${item.name}：${item.value}\n`;
          }
        });
        
        alert(summaryText);
      } else {
        console.error('[Export] 导出失败:', result.error);
        alert(`导出失败：${result.error}`);
      }
    } catch (err) {
      console.error('[Export] 导出异常:', err);
      alert(`导出失败：${err.message}`);
    }
  }
  
  /**
   * 导入数据
   */
  async function handleImport(file) {
    try {
      console.log('[Import] 开始导入...');
      
      // 读取文件
      const result = await MemoryExportSystem.importFromFile(file);
      
      if (!result.success) {
        alert(`导入失败：${result.error}`);
        return;
      }
      
      // 生成导入预览
      const summary = result.summary;
      let summaryText = `📥 导入预览\n\n`;
      summaryText += `文件：${file.name}\n`;
      summaryText += `导出日期：${summary.exportDate}\n`;
      summaryText += `角色：${summary.characterName}\n\n`;
      summaryText += `将恢复以下数据：\n`;
      summary.items.forEach(item => {
        if (item.count !== undefined) {
          summaryText += `${item.icon} ${item.name}：${item.count} 条\n`;
        } else if (item.value) {
          summaryText += `${item.icon} ${item.name}：${item.value}\n`;
        }
      });
      
      if (result.validation.warnings.length > 0) {
        summaryText += `\n⚠️ 警告：\n`;
        result.validation.warnings.forEach(w => {
          summaryText += `• ${w}\n`;
        });
      }
      
      summaryText += `\n⚠️ 警告：导入会覆盖当前所有数据！\n`;
      summaryText += `建议先导出当前数据作为备份。\n\n`;
      summaryText += `确定要继续导入吗？`;
      
      if (!confirm(summaryText)) {
        console.log('[Import] 用户取消导入');
        return;
      }
      
      // 执行恢复
      const restoreResult = MemoryExportSystem.restoreData(result.data, {
        restoreConfig: true,
        restoreMemory: true,
        restoreAffection: true,
        restoreEmotionalDepth: true,
        restorePrinciples: true,
        restorePersonality: true,
        restoreAntiAddiction: true,
      });
      
      if (restoreResult.success) {
        console.log('[Import] 导入成功');
        
        let successText = `✅ 导入成功！\n\n`;
        successText += `恢复的数据：\n`;
        restoreResult.restored.forEach(item => {
          successText += `• ${item}\n`;
        });
        successText += `\n建议：刷新页面以确保所有功能正常工作`;
        
        alert(successText);
        
        // 刷新设置面板显示
        loadConfig();
        populateMemorySettings();
        populateEmotionalDepthStats();
        populatePrinciplesStats();
        populatePersonalityStats();
        populateAntiAddictionStats();
        
        // 更新设置面板中的配置
        $('#s-name').value = config.name;
        $('#s-personality').value = config.personality;
        $('#s-api-url').value = config.apiUrl;
        $('#s-api-key').value = config.apiKey;
        $('#s-model').value = config.model;
        $('#s-tts-voice').value = config.ttsVoice;
        $('#s-memory-short-term').value = config.memory.shortTermLimit;
        $('#s-memory-summary-count').value = config.memory.summaryLimit;
        
        // 询问是否刷新页面
        if (confirm('数据导入完成！是否立即刷新页面？')) {
          location.reload();
        }
      } else {
        console.error('[Import] 恢复失败:', restoreResult.error);
        alert(`数据恢复失败：${restoreResult.error}`);
      }
    } catch (err) {
      console.error('[Import] 导入异常:', err);
      alert(`导入失败：${err.message}`);
    }
  }

  // ============================
  // 背景
  // ============================
  // 背景
  // ============================
  function bindBackgrounds() {
    const grid = $('#bg-grid');
    BG_PRESETS.forEach(bg => {
      const div = document.createElement('div');
      div.className = 'bg-thumb' + (config.background === bg.id ? ' active' : '');
      div.dataset.bgId = bg.id;
      
      // 如果已经上传了背景图片，显示预览
      if (config.backgroundImages[bg.id]) {
        div.style.backgroundImage = `url(${config.backgroundImages[bg.id]})`;
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = 'center';
      } else {
        div.textContent = bg.label;
      }
      
      div.title = bg.label;
      div.addEventListener('click', () => {
        setBackground(bg.id);
        $$('.bg-thumb').forEach(t => t.classList.remove('active'));
        div.classList.add('active');
      });
      grid.appendChild(div);
    });
    
    // 移除旧的上传按钮逻辑（现在不需要了）
  }

  function setBackground(id) {
    const el = $('#bg-layer');
    el.className = '';
    el.style.backgroundImage = '';
    
    // 如果有上传的背景图片，使用图片
    if (config.backgroundImages[id]) {
      el.style.backgroundImage = `url(${config.backgroundImages[id]})`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    } else {
      // 否则使用默认渐变色（兜底）
      el.classList.add(id);
    }
    
    config.background = id;
    saveConfig();
  }

  // ============================
  // 结束通话
  // ============================
  async function endCall() {
    clearInterval(timerInterval);
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    stopBGM();
    stopCamera();
    
    // 清理主动对话计时器
    if (proactiveTimer) {
      clearTimeout(proactiveTimer);
      proactiveTimer = null;
    }

    // 结束防沉迷会话
    try {
      AntiAddictionSystem.endSession();
      console.log('[AntiAddiction] 会话已结束');
    } catch (err) {
      console.error('[AntiAddiction] 结束会话失败:', err);
    }

    // 记忆系统：立即切回欢迎页，记忆保存后台异步执行
    const historyForMemory = [...chatHistory];
    chatHistory = [];
    $('#chat-messages').innerHTML = '';
    $('#app').classList.add('hidden');
    $('#welcome').classList.remove('hidden');

    // 异步保存记忆（不阻塞 UI）
    try {
      await Promise.all([
        MemorySystem.generateSummary(historyForMemory, {
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          model: config.model,
        }),
        MemorySystem.extractKeyMemories(historyForMemory, {
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          model: config.model,
        }),
      ]);
      console.log('[Memory] 通话结束，记忆已保存');
    } catch (err) {
      console.warn('[Memory] 记忆保存失败（不影响正常使用）:', err.message);
    }
  }

  // ============================
  // 持久化
  // ============================
  function saveConfig() {
    try {
      localStorage.setItem('ai-companion-cfg', JSON.stringify({
        name: config.name, personality: config.personality,
        apiUrl: config.apiUrl, apiKey: config.apiKey, model: config.model,
        ttsVoice: config.ttsVoice, background: config.background,
        image: config.image, // server URL, 很小
        expressions: config.expressions, // server URLs
        backgroundImages: config.backgroundImages, // 背景图片 URLs
        bgm: config.bgm, // server URLs
        bgmVolume: config.bgmVolume, bgmEnabled: config.bgmEnabled,
        // 记忆系统配置
        memory: config.memory,
        // 好感度系统配置
        userGender: config.userGender,
        aiGender: config.aiGender,
      }));
    } catch {}
  }

  function loadConfig() {
    try {
      const saved = localStorage.getItem('ai-companion-cfg');
      if (saved) Object.assign(config, JSON.parse(saved));
    } catch {}
  }

  // ============================
  // 调试接口（仅开发环境）
  // ============================
  window.DEBUG_AFFECTION = () => {
    const info = AffectionSystem.getDebugInfo();
    console.log('=== 好感度系统调试信息 ===');
    console.log('总好感度:', info.total);
    console.log('陪伴分:', info.companionship);
    console.log('拉近距离分:', info.closeness);
    console.log('安慰分:', info.comfort);
    console.log('恋爱分:', info.romance);
    console.log('关系阶段:', info.stage);
    console.log('消息计数:', info.messageCount);
    console.log('========================');
    return info;
  };

  window.DEBUG_RESET_AFFECTION = () => {
    if (confirm('确定要重置好感度系统吗？')) {
      AffectionSystem.reset();
      console.log('[Affection] 好感度系统已重置');
      // 重新构建 system prompt
      if (chatHistory.length > 0) {
        updateSystemPrompt();
      }
    }
  };

  // ============================
  // 视觉系统：摄像头 + GLM-4V 分析
  // ============================
  async function initCamera() {
    try {
      console.log('[Vision] 请求摄像头权限...');
      cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      
      // 创建隐藏的 video 元素用于捕获画面
      if (!cameraVideo) {
        cameraVideo = document.createElement('video');
        cameraVideo.autoplay = true;
        cameraVideo.playsInline = true;
        cameraVideo.style.display = 'none';
        document.body.appendChild(cameraVideo);
      }
      cameraVideo.srcObject = cameraStream;
      
      // 创建 canvas 用于截图
      if (!cameraCanvas) {
        cameraCanvas = document.createElement('canvas');
        cameraCanvas.width = 640;
        cameraCanvas.height = 480;
      }
      
      console.log('[Vision] 摄像头已启动');
      
      // 每 30 秒分析一次用户状态
      startVisionAnalysis();
    } catch (err) {
      console.error('[Vision] 摄像头启动失败:', err.message);
      addChatMsg('system', '（摄像头启动失败，将继续使用纯对话模式）');
      visionEnabled = false;
    }
  }
  
  function startVisionAnalysis() {
    if (visionInterval) clearInterval(visionInterval);
    
    // 立即执行一次
    analyzeUserVision();
    
    // 每 30 秒执行一次
    visionInterval = setInterval(() => {
      analyzeUserVision();
    }, 30000);
  }
  
  async function analyzeUserVision() {
    if (!cameraVideo || !cameraCanvas || !cameraStream) return;
    
    try {
      // 截取当前画面
      const ctx = cameraCanvas.getContext('2d');
      ctx.drawImage(cameraVideo, 0, 0, 640, 480);
      const imageData = cameraCanvas.toDataURL('image/jpeg', 0.7);
      const base64 = imageData.split(',')[1];
      
      console.log('[Vision] 分析用户状态...');
      
      // 调用 GLM-4V 分析
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          image: base64,
        }),
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      lastVisionAnalysis = data.analysis || '';
      
      console.log('[Vision] 分析结果:', lastVisionAnalysis);
      
      // 如果检测到明显的情绪变化，注入到下次对话
      if (lastVisionAnalysis) {
        // 不立即打断对话，等用户下次发消息时自动注入
      }
    } catch (err) {
      console.error('[Vision] 视觉分析失败:', err.message);
    }
  }
  
  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
    }
    if (visionInterval) {
      clearInterval(visionInterval);
      visionInterval = null;
    }
    lastVisionAnalysis = '';
    console.log('[Vision] 摄像头已关闭');
  }

  // ============================
  // 语音打断功能
  // ============================
  function stopAISpeech() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onplay = null;
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.src = '';
      currentAudio = null;
      $('#character').classList.remove('is-speaking');
      console.log('[Speech] AI 语音已打断');
    }
  }

  // ============================
  // 主动对话系统
  // ============================
  function startProactiveChat() {
    console.log('[Proactive] 主动对话系统已启动');
    resetProactiveTimer();
  }

  function resetProactiveTimer() {
    if (proactiveTimer) {
      clearTimeout(proactiveTimer);
    }
    
    // 正式版本：2-5 分钟后主动说话
    const delay = (120 + Math.random() * 180) * 1000; // 120-300 秒
    console.log(`[Proactive] 下次主动对话将在 ${Math.round(delay / 1000)} 秒后`);
    proactiveTimer = setTimeout(() => {
      triggerProactiveMessage();
    }, delay);
  }

  async function triggerProactiveMessage() {
    // 检查条件：不在处理中、用户不在输入、距离上次用户消息超过 30 秒
    const timeSinceLastMessage = Date.now() - lastUserMessageTime;
    if (isProcessing || isUserTyping || timeSinceLastMessage < 30000) {
      console.log('[Proactive] 条件不满足，重新计时');
      resetProactiveTimer(); // 条件不满足，重新计时
      return;
    }

    console.log('[Proactive] AI 主动发起对话');
    
    // 根据好感度阶段生成不同的主动对话
    const affectionStage = AffectionSystem.stage;  // 修复：使用 .stage 而不是 .getStage()
    console.log('[Proactive] 当前好感度阶段:', affectionStage);
    
    const proactivePrompts = {
      stranger: [
        '那个...你在忙吗？',
        '嗯...有点安静呢',
        '你在想什么呀？',
      ],
      friend: [
        '诶，你在干嘛呀？',
        '好无聊...陪我聊聊天嘛',
        '你知道过得怎么样？',
      ],
      close_friend: [
        '想你了...在干嘛呢？',
        '陪我说说话好不好～',
        '你怎么不理我了呀',
      ],
      bestie: [
        '嘿～想你了',
        '陪我说说话嘛～',
        '你在忙什么呀',
      ],
      lover: [
        '想你想得睡不着...',
        '你在忙吗...好想你',
        '能陪陪我吗？',
      ],
    };

    const prompts = proactivePrompts[affectionStage] || proactivePrompts.stranger;
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    // 构建主动对话的 system prompt
    const proactiveSystemPrompt = `${getSystemPromptContent()}\n\n【主动对话】你现在要主动找用户说话。用户已经有一段时间没说话了，你可以：\n- 问问用户在干什么\n- 分享你的想法\n- 表达你的情绪\n\n请自然地开启话题，不要太突兀。`;

    isProcessing = true;
    $('#typing').classList.remove('hidden');

    try {
      const messages = [
        { role: 'system', content: proactiveSystemPrompt },
        { role: 'user', content: `[AI 主动发起对话的想法：${randomPrompt}]` },
      ];

      const reply = await callAPI(messages);
      const { clean, emotion } = parseEmotion(reply);
      
      // 不加入 chatHistory（主动对话不算正式对话历史）
      addChatMsg('ai', clean);
      setEmotion(emotion);
      speakEdgeTTS(clean, () => showBubble(clean));

      const mood = EMOTION_TO_MOOD[emotion] || 'idle';
      switchBGM(mood);
    } catch (err) {
      console.error('[Proactive] 主动对话失败:', err);
    }

    isProcessing = false;
    $('#typing').classList.add('hidden');
    
    // 重新计时
    resetProactiveTimer();
  }

  // ============================
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
