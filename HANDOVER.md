# AI Companion — 开发者交接文档

> 给接手这个项目的 AI 或开发者的完整上下文。
> 最后更新：2026-05-20 10:16

---

## 一、项目是什么

一个模拟视频通话的 AI 伴侣应用。当前是 2D 原型阶段（HTML/CSS/JS + Node.js），最终目标是 Unity 3D 移动端应用。

详细产品愿景见：[产品规划-2026-05-10.md](./产品规划-2026-05-10.md) 和 [README.md](./README.md)
项目进度总览见：[PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md)

---

## 二、当前状态速览

### 已完成 ✅
- [x] 2D MVP（对话 + 表情立绘切换 + TTS + BGM + 记忆系统 + NLU）
- [x] 产品规划文档 + 5 阶段演进路线
- [x] Phase 2 Unity 集成框架（unity-bridge.js + 2 份文档），已推 GitHub
- [x] 蕾塞 Blender 模型渲染（1 张原图 + AI 生成 7 种表情）
- [x] Blender 安装 + 基础操作学习
- [x] 2026-05-19 大量 bug 修复（详见下方第八节）

### 进行中 🔧
- [ ] MVP 基础体验打磨（情绪/BGM 同步性、API 稳定性）
- [ ] 蕾塞立绘接入 MVP（素材在 `uploads/expressions/`，代码尚未接入）
- [ ] F12 调试日志待清理（`[Emotion Debug]` 和 `[BGM]` 日志）

### 待启动 📋
- [ ] Unity 3D 集成（Phase 3）
- [ ] 移动端适配（Phase 4）
- [ ] 用户系统 + 素材库（Phase 5）

---

## 三、技术架构

### 整体架构图

```
┌─────────────────────────────────────────┐
│            浏览器 / 用户界面              │
│  ┌──────────┐  ┌──────┐  ┌──────────┐   │
│  │ index.html│  │style.css│  │ app.js   │   │
│  │ (页面结构)│  │(样式+动画)│(核心逻辑) │   │
│  └────┬─────┘  └──────┘  └────┬─────┘   │
│       │                    │             │
│  ┌────┴────────────────────┴─────┐      │
│  │    memory-system.js (记忆系统)     │      │
│  │         nlu.js (NLU解析器)        │      │
│  └──────────────┬─────────────────┘      │
│                 │ API 调用               │
└─────────────────┼───────────────────────┘
                  │
       ┌──────────┴──────────┐
       │   server.js (Express) │
       │                     │
       │  POST /api/chat     │ → 代理到 LLM API
       │  POST /api/upload   │ → 文件上传
       │  GET  /api/tts      │ → Edge TTS 代理
       └─────────────────────┘
```

### 文件职责

| 文件 | 行数 | 职责 |
|------|------|------|
| `server.js` | ~100 行 | Express 静态服务 + API 代理（chat/upload/tts） |
| `public/index.html` | ~225 行 | 页面结构：欢迎页 + 通话页 + 设置弹窗 + BGM控制 |
| `public/style.css` | ~450 行 | 所有样式 + 情绪动画 CSS keyframes + 记忆管理UI |
| `public/app.js` | ~1000 行 | **核心逻辑**，详见下方 |
| `public/memory-system.js` | ~250 行 | 三层记忆架构（短期/摘要/关键记忆） |
| `public/nlu.js` | ~200 行 | 自然语言意图解析器 |
| `public/unity-bridge.js` | ~400 行 | Unity ↔ Web 桥接层（Phase 2，非 Unity 环境静默降级） |
| `docs/unity-integration.md` | ~12KB | Unity 集成指南 + 6 个组件设计 |
| `docs/blendshape-mapping.md` | ~9KB | 8 种情绪 + 微表情 + 口型映射 |

### 素材文件

```
uploads/
  expressions/
    reze_happy.png        ← 默认立绘（蕾塞微笑）
    reze_shy.png           ← AI 生成的表情变体
    reze_embarrassed.png
    reze_sad.png
    reze_angry.png
    reze_surprised.png
    reze_thinking.png
```

> ⚠️ 这些素材**尚未在代码中默认加载**，用户需要通过设置页手动上传。之前尝试写死路径导致了 bug（见第八节），已回滚。

### app.js 核心模块（按执行顺序）

```
init()
  ├─ loadConfig()          ← 从 localStorage 加载配置
  ├─ buildWelcome()         ← 构建欢迎页（立绘上传/声线/BGM/API配置）
  ├─ bindControls()          ← 绑定按钮事件（发送/麦克风/设置/结束）
  ├─ bindSettings()          ← 绑定设置保存
  └─ bindBackgrounds()       ← 绑定背景切换

startCall()                 ← 点击"开始通话"触发
  ├─ 收集配置 → saveConfig()
  ├─ 切换到通话界面
  ├─ buildSystemPrompt()    ← 构建 AI 系统 prompt（含人设+情绪规则）
  ├─ MemorySystem.load()    ← 加载历史摘要和关键记忆注入 prompt
  └─ playBGM('idle')        ← 开始播放背景音乐

sendMessage()               ← 用户发消息触发 ⭐ 最核心函数
  ├─ NLU.parse()            ← 解析用户意图（情绪/动作/记忆查询/故事）
  ├─ 追加情绪提示到消息（如果用户要求了某种情绪）
  ├─ callAPI()              ← 发给 LLM（30秒超时）
  ├─ parseEmotion()         ← 从回复中提取 [emotion:xxx] 标签
  ├─ inferEmotionFromText() ← AI 不给标签时的兜底推断（从回复关键词推断）
  ├─ setEmotion(emotion)    ← 切换立绘 + 触发粒子特效（700ms 过渡）
  ├─ speakEdgeTTS(text)     ← TTS 语音播放
  └─ switchBGM(mood)        ← 根据情绪切换BGM

endCall()                   ← 点击"结束通话"触发
  ├─ 立即切回欢迎页（不阻塞 UI）
  └─ 后台异步执行：MemorySystem.generateSummary() + extractKeyMemories()
```

---

## 四、关键设计决策

### Q1: 为什么情绪标签格式要兼容多种变体？
AI 模型输出的 `[emotion:xxx]` 格式不稳定。正则 `(?::[^\]]*?)?` 兼容 `[shy]`、`[shy:害羞]`、`[emotion:shy:害羞]` 等变体。

### Q2: 为什么 AI 不给情绪标签时有兜底？
glm-4-flash 经常不输出 `[emotion:xxx]` 标签。`inferEmotionFromText()` 从回复关键词推断情绪（如"哈哈"→happy、"嗯..."→thinking），确保情绪切换不会全部默认 idle。

### Q3: System Prompt 里情绪标签为什么标为【强制】？
因为 AI 模型经常忽略情绪标签指令。加了"【强制】必须执行"+ 3 个示例格式后，服从率大幅提升。

### Q4: 为什么立绘切换和 BGM 用 700ms 对齐？
立绘瞬间切换、BGM 800ms 淡出会让体验不协调。立绘 src 切换前的等待从 280ms 调到 700ms，总时序约 1.3s，与 BGM 的 ~1.4s 基本同步。

### Q5: endCall 为什么先切 UI 再保存记忆？
之前用 `await` 等记忆保存完成才切回欢迎页，LLM 请求慢时 UI 卡死。现在先切回欢迎页，记忆保存异步执行（不阻塞 UI）。

### Q6: BGM 为什么用实例池？
为了断点续播。每次 `new Audio()` 丢失播放位置。`bgmAudioPool[mood]` 缓存实例，暂停记录 `currentTime`，恢复时从断点继续。

### Q7: 记忆系统为什么分三层？
- **短期记忆**：直接塞 context，LLM 精确引用最近对话
- **摘要记忆**：压缩旧对话，AI 有"模糊记忆"
- **关键记忆**：永久记住重要信息（名字/喜好/承诺），不会被滚动删除

### Q8: NLU 为什么用正则？
速度和成本。每条消息都调 LLM 做意图分类太慢太贵。正则覆盖常见模式够用，识别不了降级为普通聊天。

---

## 五、已知问题 & 待改进

| # | 问题 | 状态 | 建议 |
|---|------|------|------|
| 1 | TTS 是 Edge TTS，效果一般 | 待替换 | 接入 Azure Neural TTS / Fish Audio |
| 2 | 2D 立绘不是 3D | Phase 3 后解决 | 等 Unity 3D 角色 |
| 3 | 没有用户系统 | Phase 5 | 多角色/素材库需要 |
| 4 | 没有移动端适配 | Phase 4 | 当前只适合桌面浏览器 |
| 5 | 记忆摘要生成依赖 LLM，可能失败 | 已做 try-catch 降级 | 失败时不影响对话 |
| 6 | NLU 动作指令只能显示占位文字 | Phase 3 后解决 | 等 Unity 动画序列 |
| 7 | F12 有调试日志待清理 | 待清理 | `[Emotion Debug]` 和 `[BGM]` 日志确认稳定后删除 |
| 8 | 特殊符号（书名号等）偶尔导致 API 超时 | 已加 30s 超时兜底 | 不是代码问题，是 LLM 处理慢 |
| 9 | 蕾塞模型使用条款禁止当 game avatar | 注意 | 个人学习/展示 OK，商业化需另授权 |

---

## 六、角色模型方案

### 蕾塞 Blender 模型（当前使用）
- 来源：BOOTH 购买，作者 Sulbi，电锯人 Reze
- 格式：`.blend`（Blender 5.1.0），97K 面数
- ⚠️ 使用条款禁止当 game avatar，禁止商用，禁止再分发
- Blender 渲染设置：Eevee、透明背景、1024×1536 竖版
- **面部镜像对称被破坏**（README 说明），不影响渲染
- **7 种表情立绘**已通过 AI 图片编辑生成（在 `uploads/expressions/`）

### VRM 模型（备选）
- 来源：未知作者 ProfChaos
- 格式：`.glb`（VRM 扩展），14MB，3 Mesh + 3 骨骼
- **0 个 BlendShapes**，无表情，需要后续补
- 可导入 Unity（UniVRM 插件）

### 长期方案
- VRoid Studio 免费捏人 → VRM → Unity
- 或购买 BOOTH 高质量 VRChat Avatar（$45 左右）
- 或使用 Faceit 插件（$45）给现有模型生成 BlendShapes

---

## 七、开发环境

```bash
# 启动
cd ai-companion
npm install
npm start
# 打开 http://localhost:3000

# Git 代理（Clash Verge Rev, mixed-port 7897）
git config http.proxy http://127.0.0.1:7897
git config https.proxy http://127.0.0.1:7897

# GitHub 仓库
# https://github.com/Everett-Leon/Amadeus
```

### Mac 开发环境
- macOS ARM64 (M4 MacBook Air)
- Node.js v25.8.2
- Blender 5.1.1（通过 brew 安装，brew 下载大文件不稳定需关闭 TUN 代理）
- 代理：Clash Verge Rev, TUN 模式, mixed-port **7897**

---

## 八、2026-05-19 修复的 Bug 清单

这是上次会话中修复的所有 bug，新接手的 AI 需要注意**不要回退这些修复**：

| Bug | 现象 | 原因 | 修复 |
|-----|------|------|------|
| 情绪永远 sad | 所有对话表情都变难过 | `let hintEmotion` 在 else 块内声明，try 块跨作用域引用 → ReferenceError → catch → setEmotion('sad') | 提升到函数作用域声明 |
| 结束通话卡 UI | 点结束要等很久才回欢迎页 | `await Promise.all()` 等记忆保存 | 先切 UI，异步保存记忆 |
| catch 错误情绪 | API 错误时切 sad | catch 里写死 `setEmotion('sad')` | 改为 `setEmotion('idle')` |
| API 无超时 | LLM 慢时无限等待 | fetch 没有 AbortController | 加 30s 超时 + 提示 |
| AI 不给情绪标签 | BGM/立绘不切换 | glm-4-flash 不输出 [emotion:xxx] | (1) System Prompt 加"【强制】"+示例 (2) 新增 `inferEmotionFromText()` 兜底 |
| favicon 404 | Console 报红 | 没有 favicon.ico | index.html 加 inline SVG data URI favicon |
| 立绘 BGM 不同步 | 立绘秒切 BGM 慢切 | 立绘 280ms vs BGM 1400ms | 立绘等待调到 700ms |

---

## 九、下一步做什么（按优先级）

1. **清理调试日志** — 确认情绪和 BGM 稳定后，删除 Console 日志
2. **蕾塞立绘默认加载** — 找到不会导致 bug 的方式预加载 `uploads/expressions/` 下的表情
3. **TTS 升级** — 从 Edge TTS 升级到情绪 TTS（Azure Neural TTS / Fish Audio）
4. **Phase 3** → Unity 3D 场景 + 表情平滑过渡
5. **Phase 4** → 移动端 + AR
6. **Phase 5** → C 端产品化

---

## 十、编码约定

- 所有 JS 用 IIFE 封装：`(function () { 'use strict'; ... })();`
- 中文注释
- 配置对象用 `config` 全局变量，持久化到 localStorage
- UI 操作统一用 `$ = (s) => document.querySelector(s)` 和 `$$ = (s) => document.querySelectorAll(s)`
- 新增功能模块导出为独立文件（如 memory-system.js、nlu.js），通过 `<script>` 引入顺序依赖
- **不要破坏现有功能！所有改动都是增量添加**
- **修改前先读 HANDOVER.md 和 memory/ 目录下的最新日志**

---

## 十一、少爷的偏好（新 AI 必读）

- **语言**：中文
- **称呼**：少爷
- **决策风格**：偏好快速行动，不喜欢冗长解释，出问题直接修
- **工作模式**：产品经理角色，负责产品定义 + 3D 模型 + UI/UX，AI 负责全部代码
- **沟通风格**：直接，不说废话，有问题直接说
- **工具**：macOS ARM64，代理 mixed-port 7897，brew 大文件下载需关 TUN
- **Blender**：已装会基础操作，Mac 快捷键需注意差异（fn+F12、Option=Alt）
