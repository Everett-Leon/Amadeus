const { app, BrowserWindow } = require('electron');
const path = require('path');

// 直接在主进程中启动 Express 服务器
const express = require('express');
const axios = require('axios');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const https = require('https');
const http = require('http');

let mainWindow;
let server;

// Fish Audio 配置
const FISH_AUDIO_API_KEY = 'b276509ed4024d6791d7545b9a519951';
const FISH_AUDIO_API_URL = 'https://api.fish.audio/v1/tts';

// 启动 Express 服务器
function startServer() {
  const PORT = 3000;
  const expressApp = express();
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

  expressApp.use(express.json({ limit: '100mb' }));
  expressApp.use(express.urlencoded({ limit: '100mb', extended: true }));
  expressApp.use(express.static(path.join(__dirname, 'public')));
  expressApp.use('/uploads', express.static(uploadsDir));

  // TTS 实例缓存
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

  // TTS 接口
  expressApp.get('/api/tts', async (req, res) => {
    const text = decodeURIComponent(req.query.text || '').slice(0, 500);
    const voice = req.query.voice || 'zh-CN-XiaoxiaoNeural';
    const rate = req.query.rate || '+0%';
    const pitch = req.query.pitch || '+0Hz';
    const useFishAudio = req.query.fish === 'true';
    const referenceId = req.query.referenceId || '';
    
    if (!text) return res.status(400).json({ error: 'text required' });

    try {
      if (useFishAudio && referenceId) {
        const response = await axios.post(
          FISH_AUDIO_API_URL,
          {
            text: text,
            reference_id: referenceId,
            format: 'mp3',
            mp3_bitrate: 64,
          },
          {
            headers: {
              'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
              'Content-Type': 'application/json',
            },
            responseType: 'stream',
            timeout: 15000,
          }
        );

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-store');
        response.data.pipe(res);
        return;
      }

      const tts = await getTTS(voice);
      const { audioStream } = tts.toStream(text, { rate, pitch });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      audioStream.on('error', () => { ttsInstance = null; if (!res.headersSent) res.status(500).end(); else res.end(); });
      audioStream.pipe(res);
    } catch (err) {
      console.error('[TTS error]', err.message);
      
      if (useFishAudio && referenceId) {
        try {
          ttsInstance = null;
          const tts = await getTTS('zh-CN-XiaoxiaoNeural');
          const { audioStream } = tts.toStream(text, { rate: '+0%', pitch: '+0Hz' });
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

  // 文件上传
  expressApp.post('/api/upload', (req, res) => {
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'missing fields' });
    try {
      const ext = name.split('.').pop() || 'bin';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      res.json({ url: `/uploads/${filename}`, name });
    } catch (err) {
      res.status(500).json({ error: 'upload failed: ' + err.message });
    }
  });

  // AI 聊天代理
  expressApp.post('/api/chat', async (req, res) => {
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

  // 视觉分析
  expressApp.post('/api/vision', async (req, res) => {
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
      res.json({ analysis });
    } catch (err) {
      res.status(500).json({ error: 'Vision analysis failed: ' + err.message });
    }
  });

  server = expressApp.listen(PORT, () => {
    console.log(`[Electron] 服务器已启动: http://localhost:${PORT}`);
  });
}

// 创建窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'AI Companion',
    show: false, // 先不显示，等加载完成再显示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  // 等待服务器启动后再加载页面
  setTimeout(() => {
    console.log('[Electron] 加载页面: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
  }, 5000); // 增加到 5 秒，确保服务器完全启动

  // 页面加载完成后显示窗口
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] 页面加载完成');
    mainWindow.show();
    mainWindow.focus(); // 确保窗口获得焦点
  });

  // 加载失败时的处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] 页面加载失败:', errorCode, errorDescription);
    // 重试加载
    setTimeout(() => {
      console.log('[Electron] 重试加载页面...');
      mainWindow.loadURL('http://localhost:3000');
    }, 2000);
  });

  // 开发模式：打开开发者工具（调试用）
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用启动
app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 应用退出
app.on('window-all-closed', () => {
  // 关闭服务器
  if (server) {
    console.log('[Electron] 关闭服务器...');
    server.close();
  }
  
  // Mac 上保持应用运行
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // 确保服务器被关闭
  if (server) {
    server.close();
  }
});
