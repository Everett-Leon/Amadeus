const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

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
  const text = decodeURIComponent(req.query.text || '').slice(0, 500);
  const voice = req.query.voice || 'zh-CN-XiaoxiaoNeural';
  const rate = req.query.rate || '+0%';
  const pitch = req.query.pitch || '+0Hz';
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const tts = await getTTS(voice);
    const { audioStream } = tts.toStream(text, { rate, pitch });

    res.setHeader('Content-Type', 'audio/mpeg');
    // 不缓存 — 每次请求都是独立生成
    res.setHeader('Cache-Control', 'no-store');
    audioStream.on('error', () => { ttsInstance = null; if (!res.headersSent) res.status(500).end(); else res.end(); });
    audioStream.pipe(res);
  } catch (err) {
    console.error('[TTS error]', err.message);
    ttsInstance = null;
    if (!res.headersSent) res.status(500).json({ error: 'TTS failed' });
  }
});

// ========== 文件上传（BGM / 表情图片） ==========
app.post('/api/upload', (req, res) => {
  const { name, data } = req.body; // data = base64 (no prefix)
  if (!name || !data) {
    console.error('[Upload] 缺少字段:', { hasName: !!name, hasData: !!data });
    return res.status(400).json({ error: 'missing fields' });
  }
  try {
    const ext = name.split('.').pop() || 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(data, 'base64');
    console.log(`[Upload] 上传文件: ${name} (${(buffer.length / 1024).toFixed(1)} KB) -> ${filename}`);
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    res.json({ url: `/uploads/${filename}`, name });
  } catch (err) {
    console.error('[Upload] 上传失败:', err.message);
    res.status(500).json({ error: 'upload failed: ' + err.message });
  }
});

// ========== AI 聊天代理 ==========
app.post('/api/chat', async (req, res) => {
  const { apiUrl, apiKey, model, messages } = req.body;
  if (!apiUrl || !apiKey || !model || !messages) return res.status(400).json({ error: '缺少参数' });

  const url = new URL(apiUrl);
  const transport = url.protocol === 'https:' ? https : http;
  const postData = JSON.stringify({ model, messages, temperature: 0.85, max_tokens: 512 });

  const apiReq = transport.request({
    hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData), 'Authorization': `Bearer ${apiKey}` },
  }, (apiRes) => {
    let data = '';
    apiRes.on('data', (c) => (data += c));
    apiRes.on('end', () => { try { res.status(apiRes.statusCode).json(JSON.parse(data)); } catch { res.status(502).json({ error: 'parse error' }); } });
  });
  apiReq.on('error', (e) => res.status(502).json({ error: '连接失败: ' + e.message }));
  apiReq.write(postData);
  apiReq.end();
});

app.listen(PORT, () => console.log(`🌸 AI Companion v0.3 → http://localhost:${PORT}`));
