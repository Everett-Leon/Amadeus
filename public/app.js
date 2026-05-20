// =============================================
// AI Companion v0.3 — 完整客户端逻辑
// =============================================
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ========== Edge TTS 声线列表 ==========
  const TTS_VOICES = [
    { id: 'zh-CN-XiaoxiaoNeural',  name: '晓晓', desc: '年轻女性，自然亲切' },
    { id: 'zh-CN-XiaomoNeural',    name: '晓梦', desc: '少女声线，甜美可爱' },
    { id: 'zh-CN-XiaoyiNeural',    name: '晓依', desc: '温柔女性，柔和细腻' },
    { id: 'zh-CN-XiaoruiNeural',   name: '晓瑞', desc: '活泼女性，元气满满' },
    { id: 'zh-CN-XiaohanNeural',   name: '晓涵', desc: '知性女性，清晰大方' },
    { id: 'zh-CN-XiaoshuangNeural',name: '晓双', desc: '小女孩声线，稚嫩可爱' },
    { id: 'zh-CN-XiaozhenNeural',  name: '晓甄', desc: '成熟女性，稳重优雅' },
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
    { id: 'bg-bedroom', label: '卧室', thumb: 'bg-thumb-t1' },
    { id: 'bg-library', label: '图书馆', thumb: 'bg-thumb-t2' },
    { id: 'bg-park',    label: '公园',   thumb: 'bg-thumb-t3' },
    { id: 'bg-night',   label: '夜空',   thumb: 'bg-thumb-t4' },
    { id: 'bg-sakura',  label: '樱花',   thumb: 'bg-thumb-t5' },
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
    apiUrl: '',
    apiKey: '',
    model: 'glm-4-flash',
    ttsVoice: 'zh-CN-XiaoxiaoNeural',
    image: '',
    background: 'bg-bedroom',
    expressions: {},     // emotion_id -> server URL
    bgm: {},            // mood_id -> { name, url }
    bgmVolume: 0.25,
    bgmEnabled: true,
    // 记忆系统配置
    memory: {
      shortTermLimit: 50,   // 短期记忆（发送给 LLM 的上下文条数）
      summaryLimit: 5,      // 注入 system prompt 的摘要数量
    },
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
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, data: base64 }),
        })
          .then(r => r.json())
          .then(resolve)
          .catch(reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ============================
  // 初始化
  // ============================
  function init() {
    loadConfig();
    buildWelcome();
    bindControls();
    bindSettings();
    bindBackgrounds();
    initSpeechRecognition();
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
        const a = new Audio(`/api/tts?text=${encodeURIComponent('嗯…你好呀，今天过得怎么样？')}&voice=${encodeURIComponent(v.id)}&_t=${Date.now()}`);
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

    // — 恢复配置 —
    if (config.image) { $('#w-preview').src = config.image; $('#w-preview').classList.remove('hidden'); }
    if (config.apiUrl)     $('#w-api-url').value = config.apiUrl;
    if (config.model)      $('#w-model').value = config.model;
    if (config.personality)$('#w-personality').value = config.personality;
    if (config.apiKey)     $('#w-api-key').value = config.apiKey;

    const check = () => {
      const ok = config.image || ($('#w-preview').src && $('#w-preview').src !== window.location.href);
      const key = !!$('#w-api-key').value.trim();
      $('#w-start').disabled = !(ok && key);
      $('#w-hint').textContent = (!ok && !key) ? '请上传角色立绘并填写 API Key' : !ok ? '请上传角色立绘' : '请填写 API Key';
    };

    $('#w-image').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      uploadFile(file).then(res => {
        config.image = res.url;
        $('#w-preview').src = config.image;
        $('#w-preview').classList.remove('hidden');
        check();
      });
    });

    $('#w-api-key').addEventListener('input', check);
    check();
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
    config.name        = config.personality.match(/你叫(\S+?)[，,、\s]/)?.[1] || '小雪';

    $('#char-name').textContent = config.name;
    $('#char-base').src = config.image;
    $('#char-base')._lastSrc = config.image;

    saveConfig();
    $('#welcome').classList.add('hidden');
    $('#app').classList.remove('hidden');

    startTimer();
    setEmotion('idle');

    // 构建包含记忆上下文的 system prompt
    chatHistory = [{ role: 'system', content: buildSystemPrompt() }];
    addChatMsg('ai', `（${config.name}已上线，正在等你说话…）`);

    // BGM：在用户点击"开始通话"的交互上下文中预创建并播放，避免浏览器自动播放拦截
    const hasAnyBGM = Object.keys(config.bgm).length > 0;
    $('#bgm-bar').style.display = hasAnyBGM ? '' : 'none';
    if (hasAnyBGM) {
      // 预创建 idle BGM Audio 实例，利用当前点击事件上下文解锁播放
      const idleAudio = getOrCreateBgmAudio('idle');
      if (idleAudio) {
        idleAudio.volume = 0; // 先静音播放来解锁
        idleAudio.play().then(() => {
          idleAudio.pause();
          idleAudio.volume = config.bgmEnabled ? (config.bgmVolume || 0.25) : 0;
          if (config.bgmEnabled) {
            playBGM('idle');
          }
        }).catch(() => {
          // 解锁失败也不影响通话
        });
      }
    }
  }

  function buildSystemPrompt() {
    // 构建记忆上下文
    const memoryContext = MemorySystem.buildMemoryContext();

    let prompt = `${config.personality}`;

    // 如果有记忆内容，追加到人设之后
    if (memoryContext) {
      prompt += `\n\n${memoryContext}\n\n请根据以上记忆信息，自然地在对话中提及或回应相关内容，让用户感觉到你真的记得过去的事情。但不要刻意强调"我记得"，而是自然地融入对话。`;
    }

    prompt += `

规则：
1. 你正在和用户视频通话，回复要口语化、自然、简短。
2. 【强制】每次回复的最后一行必须包含且仅包含一个情绪标签，格式为 [emotion:xxx]。可选值：happy / shy / embarrassed / sad / angry / surprised / thinking / idle。这是系统要求，不是可选项，必须执行。
3. 情绪标签不会显示给用户，也不会被读出来。你只需要用它来表达你当前的情绪状态。
4. 严禁在对话中出现任何方括号标签（除了情绪标签），像正常人说话一样。
5. 你的情绪要严格符合你的人设。比如你性格害羞，那被夸奖时一定会害羞；你性格开朗，那大部分时候都很开心。你的性格决定了你的情绪反应，不要忽视这一点。
6. 回复长度控制在 1-2 句话，像视频通话一样自然。
7. 示例：
   - "你好呀～今天天气真好呢 [emotion:happy]"
   - "诶、那个...谢谢夸奖啦 [emotion:shy]"
   - "嗯...让我想想 [emotion:thinking]"`;

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
    $('#btn-mic').addEventListener('click', toggleMic);
    $('#btn-chat').addEventListener('click', () => $('#chat-panel').classList.toggle('hidden'));
    $('#btn-close-chat').addEventListener('click', () => $('#chat-panel').classList.add('hidden'));
    $('#btn-bg').addEventListener('click', () => $('#modal-bg').classList.remove('hidden'));
    $('#btn-settings').addEventListener('click', () => { populateSettings(); $('#modal-settings').classList.remove('hidden'); });
    $('#btn-end').addEventListener('click', () => { if (!confirm('确定要结束通话吗？')) return; endCall(); });

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

      const reply = await callAPI(messagesToSend);
      const { clean, emotion } = parseEmotion(reply);
      console.log(`[Emotion Debug] AI原文: ${reply} | 解析情绪: ${emotion} | 用户提示: ${hintEmotion || '无'}`);
      chatHistory.push({ role: 'assistant', content: clean });
      addChatMsg('ai', clean);

      // 兜底：用户明确要求了情绪，但 AI 没给标签或给了 idle，前端强制切
      const finalEmotion = (hintEmotion && emotion === 'idle') ? hintEmotion : emotion;
      setEmotion(finalEmotion);
      speakEdgeTTS(clean, () => showBubble(clean));

      const mood = EMOTION_TO_MOOD[emotion] || 'idle';
      switchBGM(mood);
    } catch (err) {
      console.error('API error:', err);
      if (err.name === 'AbortError') {
        addChatMsg('ai', '（回复超时了，请再试一次）');
      } else {
        addChatMsg('ai', '（网络错误，请检查 API 配置…）');
      }
      setEmotion('idle');
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
  // Edge TTS（无 rate/pitch 调整，保持原声）
  // ============================
  function speakEdgeTTS(text, onReady) {
    // 彻底停掉上一段语音
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onplay = null;
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.src = '';
      currentAudio = null;
    }

    const audio = new Audio();
    // 加时间戳防止浏览器缓存导致播放错乱
    audio.src = `/api/tts?text=${encodeURIComponent(text.slice(0, 300))}&voice=${encodeURIComponent(config.ttsVoice)}&_t=${Date.now()}`;
    audio.volume = 1;

    // 注意：不再在 onplay 中调用 setEmotion('talking')，保持当前立绘不变
    audio.onplay = () => {
      audioUnlocked = true;
      // 说话时加浮动动画，但不切换立绘
      $('#character').classList.add('is-speaking');
      if (onReady) onReady();
    };
    audio.onended = () => {
      currentAudio = null;
      $('#character').classList.remove('is-speaking');
      // 语音播完，立绘回归平静
      if (currentEmotion !== 'idle') setEmotion('idle');
    };
    audio.onerror = () => {
      currentAudio = null;
      $('#character').classList.remove('is-speaking');
      if (currentEmotion !== 'idle') setEmotion('idle');
      if (onReady) onReady();
    };

    audio.play().catch(() => {
      setTimeout(() => audio.play().catch(() => {}), 200);
    });
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
      console.log('[BGM] playing:', track.name);
      $('#bgm-name').textContent = track.name.replace(/\.[^.]+$/, '');
    }).catch((e) => {
      console.warn('[BGM] autoplay blocked, waiting for user interaction');
      bgmAudio = audio;
      const retry = () => {
        audio.currentTime = audio._pausedAt || 0;
        audio._pausedAt = 0;
        audio.play().then(() => {
          fadeAudio(audio, config.bgmVolume || 0.25, 600);
          console.log('[BGM] playing after retry:', track.name);
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
    console.log('[BGM] switchBGM:', newMood, '| enabled:', config.bgmEnabled, '| current:', currentBgmMood, '| tracks:', Object.keys(config.bgm));
    if (!config.bgmEnabled || newMood === currentBgmMood) return;
    if (config.bgm[newMood]) playBGM(newMood);
    else if (config.bgm['idle'] && currentBgmMood !== 'idle') playBGM('idle');
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
    recognition.interimResults = false;
    recognition.onresult = (e) => { $('#msg-input').value = e.results[0][0].transcript; stopMic(); sendMessage(); };
    recognition.onerror = () => stopMic();
    recognition.onend = () => stopMic();
  }

  function toggleMic() {
    if (!recognition) return;
    if ($('#btn-mic').classList.contains('recording')) { recognition.stop(); stopMic(); }
    else { try { recognition.start(); $('#btn-mic').classList.add('recording'); } catch {} }
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
    const keyMemories = MemorySystem.getKeyMemory();
    if (keyMemories.length === 0) {
      keyList.innerHTML = '<div class="memory-empty">暂无关键记忆（结束通话后自动提取）</div>';
    } else {
      keyMemories.forEach((m, i) => {
        const el = document.createElement('div');
        el.className = 'memory-item';
        const typeLabel = { preference: '🎯 偏好', event: '📅 事件', promise: '🤝 承诺', fact: '📝 事实' };
        el.innerHTML = `
          <span class="memory-type">${typeLabel[m.type] || m.type}</span>
          <span class="memory-text">${escapeHtml(m.content)}</span>
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
      if (chatHistory.length > 0) chatHistory[0] = { role: 'system', content: buildSystemPrompt() };
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
  }

  // ============================
  // 背景
  // ============================
  function bindBackgrounds() {
    const grid = $('#bg-grid');
    BG_PRESETS.forEach(bg => {
      const div = document.createElement('div');
      div.className = `bg-thumb ${bg.thumb}` + (config.background === bg.id ? ' active' : '');
      div.title = bg.label;
      div.addEventListener('click', () => { setBackground(bg.id, ''); $$('.bg-thumb').forEach(t => t.classList.remove('active')); div.classList.add('active'); });
      grid.appendChild(div);
    });
    $('#bg-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      uploadFile(file).then(res => {
        setBackground('bg-custom', res.url);
        const div = document.createElement('div');
        div.className = 'bg-thumb active';
        div.style.backgroundImage = `url(${res.url})`;
        div.title = '自定义背景';
        $$('.bg-thumb').forEach(t => t.classList.remove('active'));
        grid.appendChild(div);
      });
    });
  }

  function setBackground(id, url) {
    const el = $('#bg-layer');
    el.className = ''; el.style.backgroundImage = '';
    if (id === 'bg-custom' && url) { el.classList.add('bg-custom'); el.style.backgroundImage = `url(${url})`; }
    else el.classList.add(id);
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
        bgm: config.bgm, // server URLs
        bgmVolume: config.bgmVolume, bgmEnabled: config.bgmEnabled,
        // 记忆系统配置
        memory: config.memory,
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
