const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const axios = require('axios');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Fish Audio 配置（API Key 从环境变量读取，不再硬编码）
const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || '';
const FISH_AUDIO_API_URL = 'https://api.fish.audio/v1/tts';

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err.message));
process.on('unhandledRejection', (r) => console.error('[UNHANDLED]', r));

// ========== TTS（缓存实例加速，出错自动重建） ==========
let ttsInstance = null;
let ttsVoiceName = '';

async function getTTS(voice) {
  if (ttsInstance && ttsVoiceName === voice) {
    try { return ttsInstance; } catch { /* stale */ }
  }
  ttsInstance = new MsEdgeTTS();
  await ttsInstance.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  ttsVoiceName = voice;
  return ttsInstance;
}

app.get('/api/tts', async (req, res) => {
  // 注：Express 的 query parser 已经对 query string 做过一次 URL 解码了，
  // 这里不能再手动 decodeURIComponent 一次——否则文本里任何一个裸 "%"
  // （比如"50%的信心"、"电量剩30%"这种日常对话里极常见的表达）都会让
  // decodeURIComponent 抛出 "URI malformed"，导致该条消息 TTS 直接 500，完全没声音。
  const rawText = String(req.query.text || '');
  const voice = req.query.voice || 'zh-CN-XiaoxiaoNeural';
  const rate = req.query.rate || '+0%';
  const pitch = req.query.pitch || '+0Hz';
  const useFishAudio = req.query.fish === 'true'; // 是否使用 Fish Audio
  const referenceId = req.query.referenceId || ''; // Fish Audio 参考音频 ID
  const useSSML = req.query.ssml === 'true'; // 是否使用 SSML（仅 Edge TTS 支持）
  
  // 检测是否为 SSML 格式
  const isSSML = useSSML || rawText.trim().startsWith('<speak>');
  
  // 限制文本长度（SSML 可以稍长一些）
  const maxLength = isSSML ? 1000 : 500;
  const text = rawText.slice(0, maxLength);
  
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    // 使用 Fish Audio（不支持 SSML）
    if (useFishAudio && referenceId && FISH_AUDIO_API_KEY) {
      console.log(`[Fish Audio] 生成语音: ${text.slice(0, 50)}...`);
      
      // Fish Audio 不支持 SSML，需要提取纯文本
      const plainText = isSSML ? extractTextFromSSML(text) : text;
      
      const response = await axios.post(
        FISH_AUDIO_API_URL,
        {
          text: plainText,
          reference_id: referenceId,
          format: 'mp3',
          mp3_bitrate: 64, // 降低到 64kbps，加快生成速度
        },
        {
          headers: {
            'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 15000, // 15 秒超时
        }
      );

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      response.data.pipe(res);
      console.log(`[Fish Audio] 语音生成成功`);
      return;
    }

    // 使用 Edge TTS（支持 SSML）
    const tts = await getTTS(voice);
    
    if (isSSML) {
      console.log(`[Edge TTS] 使用 SSML 生成语音: ${text.slice(0, 100)}...`);
      // Edge TTS 支持 SSML，但需要确保格式正确
      const { audioStream } = tts.toStream(text);
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      audioStream.on('error', () => { ttsInstance = null; if (!res.headersSent) res.status(500).end(); else res.end(); });
      audioStream.pipe(res);
    } else {
      // 纯文本模式，使用 rate 和 pitch 参数
      const { audioStream } = tts.toStream(text, { rate, pitch });
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      audioStream.on('error', () => { ttsInstance = null; if (!res.headersSent) res.status(500).end(); else res.end(); });
      audioStream.pipe(res);
    }
  } catch (err) {
    console.error('[TTS error]', err.message);
    
    // Fish Audio 失败时，自动降级到 Edge TTS
    if (useFishAudio && referenceId) {
      console.log('[Fish Audio] 失败，降级到 Edge TTS');
      try {
        ttsInstance = null;
        const plainText = isSSML ? extractTextFromSSML(text) : text;
        const tts = await getTTS('zh-CN-XiaoxiaoNeural');
        const { audioStream } = tts.toStream(plainText, { rate: '+0%', pitch: '+0Hz' });
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-store');
        audioStream.pipe(res);
        return;
      } catch (fallbackErr) {
        console.error('[Edge TTS fallback error]', fallbackErr.message);
      }
    }
    
    ttsInstance = null;
    if (!res.headersSent) res.status(500).json({ error: 'TTS failed: ' + err.message });
  }
});

// ========== 辅助函数：从 SSML 提取纯文本 ==========
function extractTextFromSSML(ssml) {
  // 移除所有 XML 标签
  let text = ssml.replace(/<[^>]+>/g, ' ');
  // 移除多余空白
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// ========== 文件上传（BGM / 表情图片） ==========
app.post('/api/upload', (req, res) => {
  const { name, data } = req.body; // data = base64 (no prefix)
  if (!name || !data) {
    console.error('[Upload] 缺少字段:', { hasName: !!name, hasData: !!data });
    return res.status(400).json({ error: 'missing fields' });
  }
  try {
    // 安全修复：ext 来自用户传的 name，之前没做任何过滤——如果 name 里没有 "."
    // （比如 name = "../../../../tmp/evil"），split('.').pop() 会把整个字符串
    // 当成 "扩展名" 塞进 filename，里面带的 "/"、".." 会让 path.join() 逃出
    // uploadsDir，变成任意路径写入（路径穿越漏洞）。这里改成白名单，只允许
    // 常见的字母数字扩展名，且限制长度。
    const rawExt = (name.includes('.') ? name.split('.').pop() : '') || '';
    const ext = /^[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt : 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const destPath = path.join(uploadsDir, filename);
    // 双重保险：再校验一遍最终路径确实落在 uploadsDir 内
    if (!destPath.startsWith(uploadsDir + path.sep)) {
      console.error('[Upload] 检测到路径穿越尝试:', name);
      return res.status(400).json({ error: 'invalid filename' });
    }
    const buffer = Buffer.from(data, 'base64');
    console.log(`[Upload] 上传文件: ${name} (${(buffer.length / 1024).toFixed(1)} KB) -> ${filename}`);
    fs.writeFileSync(destPath, buffer);
    res.json({ url: `/uploads/${filename}`, name });
  } catch (err) {
    console.error('[Upload] 上传失败:', err.message);
    res.status(500).json({ error: 'upload failed: ' + err.message });
  }
});

// ========== AI 聊天代理 ==========
// 注：之前"偶发 502"排查不出根因，是因为所有网络错误/超时/解析失败都被无差别地
// 标记成 502 且完全没有服务端日志——出问题时无从下手。这里补上错误日志和显式超时，
// 且尽量把上游真实状态码/错误原因透传出来，方便下次真的出问题时能定位。
app.post('/api/chat', async (req, res) => {
  const { apiUrl, apiKey, model, messages } = req.body;
  if (!apiUrl || !apiKey || !model || !messages) return res.status(400).json({ error: '缺少参数' });

  let url;
  try {
    url = new URL(apiUrl);
  } catch (e) {
    return res.status(400).json({ error: 'apiUrl 格式错误: ' + e.message });
  }

  const transport = url.protocol === 'https:' ? https : http;
  const postData = JSON.stringify({ model, messages, temperature: 0.85, max_tokens: 512 });
  let responded = false;
  const respondOnce = (status, body) => {
    if (responded || res.headersSent) return;
    responded = true;
    res.status(status).json(body);
  };

  const apiReq = transport.request({
    hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData), 'Authorization': `Bearer ${apiKey}` },
    timeout: 30000, // 与前端 callAPI() 的 30s 超时保持一致
  }, (apiRes) => {
    let data = '';
    apiRes.on('data', (c) => (data += c));
    apiRes.on('end', () => {
      try {
        respondOnce(apiRes.statusCode, JSON.parse(data));
      } catch (parseErr) {
        console.error(`[Chat API] 上游返回非 JSON (status=${apiRes.statusCode}):`, data.slice(0, 300));
        // 透传上游真实状态码（多数是它真的错了），拿不到才兜底 502
        respondOnce(apiRes.statusCode || 502, { error: '上游返回解析失败: ' + parseErr.message });
      }
    });
  });

  apiReq.on('timeout', () => {
    console.error(`[Chat API] 请求超时 (30s): ${url.hostname}${url.pathname}`);
    apiReq.destroy();
    respondOnce(504, { error: 'LLM API 请求超时（30s）' });
  });

  apiReq.on('error', (e) => {
    console.error(`[Chat API] 请求错误 (${url.hostname}):`, e.message);
    respondOnce(502, { error: '连接失败: ' + e.message });
  });

  apiReq.write(postData);
  apiReq.end();
});

// ========== 视觉分析（GLM-4V）==========
app.post('/api/vision', async (req, res) => {
  const { apiUrl, apiKey, image } = req.body;
  if (!apiUrl || !apiKey || !image) return res.status(400).json({ error: '缺少参数' });

  try {
    const response = await axios.post(
      apiUrl,
      {
        model: 'glm-4v',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                },
              },
              {
                type: 'text',
                text: '请简短描述用户当前的表情和状态（1-2 句话）。例如："用户在微笑，看起来心情不错" 或 "用户皱着眉头，似乎有些困扰"。',
              },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const analysis = response.data.choices?.[0]?.message?.content || '';
    console.log('[Vision] GLM-4V 分析结果:', analysis);
    res.json({ analysis });
  } catch (err) {
    console.error('[Vision] GLM-4V 调用失败:', err.message);
    res.status(500).json({ error: 'Vision analysis failed: ' + err.message });
  }
});

// 仅在直接运行 `node server.js` 时才自动监听端口。
// 被 electron.js 通过 require('./server.js') 复用时，由调用方决定何时/是否 listen，
// 避免两份重复的路由实现分别维护（这正是 Fish Audio Key 泄露 bug 的根源）。
if (require.main === module) {
  app.listen(PORT, () => console.log(`🌸 AI Companion v0.3 → http://localhost:${PORT}`));
}

module.exports = app;
