# 🤝 AI Companion (Amadeus) · 项目交接文档

> **写给下一个接手的 Agent：你需要的全部上下文都在这里。**
> 最后更新：2026-07-12 18:36

---

## 一、项目概览

模拟视频通话的 AI 伴侣应用。当前 2D MVP 阶段（HTML/CSS/JS + Node.js），产品目标是 Unity 3D + AR 移动端 C 端产品。

| 项目 | 信息 |
|------|------|
| **名称** | Amadeus（AI Companion） |
| **技术栈** | Node.js + Express + 原生 HTML/CSS/JS |
| **端口** | `localhost:3000` |
| **LLM** | 智谱 GLM-4-Flash（免费） |
| **TTS** | Fish Audio（AD学姐声线，付费） + Edge TTS 降级（免费） |
| **GitHub** | <https://github.com/Everett-Leon/Amadeus> |
| **版本** | v0.3.0 |
| **产品文档** | [产品规划-2026-05-10.md](./产品规划-2026-05-10.md) |
| **主人** | 少爷（产品经理，管产品定义 + UI/UX + 3D 模型，AI 写全部代码） |

---

## 二、当前状态一览

| 类别 | 状态 | 说明 |
|------|------|------|
| P0 Bug 修复 | ✅ 全部完成 | API Key 硬编码泄露、jQuery `lastChild` TypeError、`chatHistory[0]` 裸引用 |
| P1 Bug 修复 | ✅ 全部完成 | `config.background` 去重、System Prompt 脏标记、localStorage 集中管理、错误边界 |
| Fish Audio TTS | ✅ 已接入 | AD学姐声线可用，API Key 环境变量化，空值降级 Edge TTS |
| 声线 | ⚠️ 需注意 | AD学姐是 Fish Audio 付费声线，每句话都扣费，少爷还没决定要不要切免费方案 |
| 服务器 | 🔄 偶发不稳定 | 有时启动后 502，需要多次重启，根因未定位 |
| 浏览器兼容 | ⚠️ 仅 Chrome | Safari 兼容性极差已放弃 |
| Unity 3D | 📋 未启动 | Phase 3，等前端稳定后再推进 |
| 移动端 | 📋 未启动 | Phase 4 |

---

## 三、文件架构

```
ai-companion/
├── server.js                      # Express 服务器（~240行）
├── package.json                   # 依赖：express, axios, msedge-tts
├── .gitignore                     # node_modules, uploads, *.log, 上下文快照
├── 产品规划-2026-05-10.md         # 5 阶段产品演进路线
├── HANDOVER.md                    # ← 你正在读的这个文件
│
├── public/
│   ├── index.html                 # 页面结构（欢迎页 + 通话页 + 设置弹窗）
│   ├── style.css                  # 样式 + 情绪动画 keyframes
│   ├── app.js                     # ⭐ 核心逻辑（~3000行，17个系统模块）
│   ├── storage-keys.js            # 🆕 localStorage key 统一管理（STORAGE 全局对象）
│   ├── memory-system.js           # 三层记忆架构
│   ├── nlu.js                     # NLU 意图解析（正则引擎）
│   ├── affection-system.js        # 好感度系统
│   ├── personality-consistency-system.js   # 人格一致性
│   ├── emotional-depth-system.js  # 情感深度
│   ├── physiological-state-system.js # 虚拟生理状态
│   ├── physiological-state-visual.js   # 生理状态可视化
│   ├── ai-principles-system.js    # AI 原则系统
│   ├── ssml-emotion-system.js     # SSML 语音情感增强
│   ├── advanced-speech-rhythm-system.js  # 高级语音节奏
│   ├── overlap-speech-system.js   # 重叠说话系统
│   ├── overlap-speech-visual.js   # 重叠说话可视化
│   ├── anti-addiction-system.js   # 防沉迷系统
│   ├── memory-export-system.js    # 记忆导出
│   └── unity-bridge.js            # Unity ↔ Web 桥接层（Phase 2，静默降级）
│
├── docs/
│   ├── unity-integration.md       # Unity 集成指南
│   └── blendshape-mapping.md      # 8 种情绪 + 微表情 + 口型映射
│
├── electron.js                    # Electron 桌面打包入口
│
└── 🎉/✅/📋/🎊 开头的 .md 文件     # 大量阶段性完成报告，建议归档到 docs/
```

### ⚠️ 重要：这个项目大量使用 Globals

`app.js` 约 3000 行，17 个系统通过全局变量耦合：
- `config` — 全局配置对象，从 localStorage 读写
- `$`, `$$` — 全局 DOM 选择器缩写
- `STORAGE` — localStorage key 命名空间（`storage-keys.js` 定义）
- `chatHistory` — 对话历史数组，`chatHistory[0]` 是 System Prompt
- 各系统模块通过 `<script>` 标签引入，依赖加载顺序

**不要改动全局对象名称和 `<script>` 加载顺序，除非你准备做大规模重构。**

---

## 四、关键修复记录（2026-06 ~ 2026-07）

### 代码仓库：`/Users/luofanchen/.openclaw-autoclaw/workspace/ai-companion/`
### 运行目录：`~/Desktop/Amadeus/ai-companion/`

两个目录需要**手动同步**（`cp`），没有自动 sync 机制。

| 提交 | 修复内容 | 注意事项 |
|------|---------|---------|
| `a205033` | **P0 #1-#3**：API Key 环境变量化、jQuery lastChild 修复、chatHistory 安全访问 | `FISH_AUDIO_API_KEY` 在 `~/.zshrc` 中配置（具体值不写入仓库，问少爷要） |
| `b589dad` | **P1 #4-#5**：config.background 重复定义分离、System Prompt 脏标记 | `sceneBg` 替代了 `config.background`，旧数据自动迁移 |
| `3b8e9ec` | **P1 #6-#7**：`storage-keys.js` 统一管理 12 个 localStorage key、buildSystemPrompt 独立 try/catch | **新增文件**，不要删除 |
| （待补充） | **安全修复**：`electron.js` 与 `HANDOVER.md/.html` 中硬编码/明文记录的 Fish Audio API Key 已清除，`electron.js` 改为读 `process.env.FISH_AUDIO_API_KEY`（与 `server.js` 保持一致） | ⚠️ 泄露的两个 key 已在公开仓库历史中出现过，**必须去 Fish Audio 后台吊销重新生成**，改代码本身不能撤销已公开的旧 key |

### P0 Bug 详情（最重要）

1. **API Key 硬编码泄露** → 改为 `process.env.FISH_AUDIO_API_KEY`，空值时降级 Edge TTS
2. **jQuery `lastChild` TypeError** → `element.lastChild` 在某些 DOM 状态为 null → 改用 `$(...).children().last()[0]`
3. **`chatHistory[0]` 11 处裸引用** → 封装为 `getSystemPromptContent()` / `updateSystemPrompt()` 函数

### P1 Bug 详情

4. **`config.background` 重复定义** → 分离出 `sceneBg` 变量 + 旧数据迁移兼容
5. **System Prompt 5 次重复构建** → 脏标记 `markPromptDirty()` / `flushSystemPrompt()`，只在真正需要时重建
6. **localStorage 12 个 key 散落 8 个文件** → `public/storage-keys.js` 中 `STORAGE` 全局对象统一管理
7. **`buildSystemPrompt()` 无错误边界** → 每个系统模块调用独立 try/catch，单个崩溃不影响整体 prompt 构建

---

## 五、Fish Audio TTS 记录

### 声线配置

```javascript
// app.js 第 73 行
ttsVoice: 'fish-7f92f8afb8ec43bf81429cc1c9199cb1',  // 显示名：🐟 AD学姐
```

### API Key

- Key：存在 `~/.zshrc` 中，**不写入仓库**（历史上曾在此文档和 `electron.js` 中硬编码泄露过，已修复并建议已吊销重新生成，问少爷要最新值）
- 这是少爷新注册的账号，之前旧账号（`7f92f8...` 同一个 referenceId 也是旧账号的）已失效
- **Fish Audio 是付费的**，每次 AI 说话都调用 TTS API 会扣费
- 少爷没决定要不要切免费方案（Edge TTS），不要擅自改默认声线

### 试听加载慢问题（已解决）

- **根因**：Fish Audio API 没额度时超时 15 秒才降级
- **解决**：充值后 API 返回正常，试听 ~0.7 秒出音频
- **额外发现**：之前误以为需要配代理（`https-proxy-agent`），实际 Clash TUN 模式自动路由，加代理反而可能干扰。**代码中无代理配置，已还原。**

### TTS 容错流程

```
用户说话 → AI 回复 → 调用 Fish Audio
                        ├─ 成功 → 播放 AD学姐声音（1~2秒）
                        └─ 失败（超时/402/503）
                            └─ 降级 → Edge TTS（免费）
```

---

## 六、启动方式

```bash
# 两个工作目录，都要同步：
# 编辑在：/Users/luofanchen/.openclaw-autoclaw/workspace/ai-companion/
# 运行在：~/Desktop/Amadeus/ai-companion/

cd ~/Desktop/Amadeus/ai-companion
export FISH_AUDIO_API_KEY="<问少爷要，存在 ~/.zshrc 中，不要写入仓库文件>"
node server.js
# → http://localhost:3000
```

### 同步命令

```bash
# 编辑完后同步到运行目录
cp /Users/luofanchen/.openclaw-autoclaw/workspace/ai-companion/server.js ~/Desktop/Amadeus/ai-companion/server.js
cp /Users/luofanchen/.openclaw-autoclaw/workspace/ai-companion/public/app.js ~/Desktop/Amadeus/ai-companion/public/app.js
cp /Users/luofanchen/.openclaw-autoclaw/workspace/ai-companion/public/storage-keys.js ~/Desktop/Amadeus/ai-companion/public/storage-keys.js
```

### Git 推送

```bash
cd ~/Desktop/Amadeus/ai-companion
git config http.proxy http://127.0.0.1:7897
git config https.proxy http://127.0.0.1:7897
git add . && git commit -m "..." && git push
```

---

## 七、代理环境

- **Clash Verge Rev**，TUN 模式，mixed-port：**7897**（不是默认的 7890！）
- Git 推送需要配 `git config http.proxy http://127.0.0.1:7897`
- 有时 TUN 模式会导致一些网站打不开，关掉 TUN 或切「规则」模式试试

---

## 八、架构核心流程

```
init()
  ├─ loadConfig()           ← localStorage 加载配置
  ├─ buildWelcome()         ← 构建设置页（立绘/声线/BGM/API）
  ├─ bindControls()         ← 事件绑定
  ├─ bindSettings()         ← 设置保存
  └─ bindBackgrounds()      ← 背景切换

startCall()
  ├─ 收集 config → saveConfig()
  ├─ 切换到通话界面
  ├─ buildSystemPrompt()     ← 构建 AI 系统 prompt
  └─ playBGM('idle')

sendMessage()                ← ⭐ 最核心
  ├─ NLU.parse()            ← 意图解析
  ├─ callAPI()               ← LLM 调用（30s 超时）
  ├─ parseEmotion() / inferEmotionFromText() ← 情绪提取
  ├─ setEmotion()            ← 立绘切换 + 特效
  ├─ speakTTS()              ← Fish Audio → Edge TTS 降级
  └─ switchBGM()

endCall()
  ├─ 先切回欢迎页（不阻塞 UI）
  └─ 后台异步：MemorySystem + 记忆保存
```

---

## 九、少爷的偏好（新 AI 必读）

| 事项 | 说明 |
|------|------|
| **语言** | 中文 |
| **称呼** | 少爷 |
| **决策风格** | 快速行动，直接修，少废话 |
| **不要做什么** | **没问就改代码、改配置、改默认值**——AD学姐被改过一回了，别再来 |
| **代理端口** | 7897（不是 7890！） |
| **brew 大文件** | 下载需关 TUN |

---

## 十、已知问题 & 下一步

| # | 问题 | 优先级 | 说明 |
|---|------|--------|------|
| 1 | Fish Audio 费用 | 待少爷决定 | 每次 AI 说话都扣费，方案已列 5 种，少爷还在考虑 |
| 2 | 服务器偶发 502 | 中 | 有时启动后请求 502，kill 重启就好，根因没查到 |
| 3 | Safari 兼容 | 低（已放弃） | Safari 大量 CSS/JS 不兼容，建议用 Chrome 无痕模式 |
| 4 | F12 调试日志 | 低 | `[Emotion Debug]` 和 `[BGM]` 日志待清理 |
| 5 | 蕾塞立绘素材 | 低 | 素材存在 `uploads/expressions/` 但未在代码中默认加载 |
| 6 | Unity 3D 集成 | Phase 3 | 前端稳定后再推 |
| 7 | 移动端适配 | Phase 4 | 远期目标 |
| 8 | Electron 打包 | 待定 | `electron.js` 已写但未测试 |

---

## 十一、重要教训（来自踩坑）

1. **改动前先读这个文档** — 别让之前修的 bug 又回来
2. **两个目录要同步** — workspace 编辑 → Desktop 运行，容易忘 sync
3. **不要擅自改全局变量** — app.js 3000 行，全局耦合很深
4. **TUN 模式可能不稳** — 如果 Fish Audio 超时，先检查 Clash 状态
5. **少爷说"不改"就别改** — 即使你觉得改了更好

---

> **给下一个 Agent：不用慌，这个项目已经跑通了。修好已知问题后就该推 Phase 3 了。**
