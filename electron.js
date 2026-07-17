const { app, BrowserWindow } = require('electron');

// 复用 server.js 里唯一的 Express app 实例（含全部路由、TTS 降级逻辑等），
// 不再维护一份重复代码 —— 避免出现两份实现不同步的 bug（例如曾经的 API Key 硬编码泄露）。
// server.js 检测到自己是被 require 而非直接 `node server.js` 运行时，不会自动 listen，
// 由这里决定何时启动监听。
const expressApp = require('./server.js');

const PORT = process.env.PORT || 3000;

let mainWindow;
let server;

function startServer() {
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
