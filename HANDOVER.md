# AI Companion — 开发者交接文档

> 给接手这个项目的 AI 或开发者的完整上下文。
> 最后更新：2026-05-11

---

## 一、项目是什么

一个模拟视频通话的 AI 伴侣应用。当前是 2D 原型阶段（HTML/CSS/JS + Node.js），最终目标是 Unity 3D 移动端应用。

详细产品愿景见：[产品规划-2026-05-10.md](./产品规划-2026-05-10.md) 和 [README.md](./README.md)

---

## 二、技术架构

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
| `public/index.html` | ~140 行 | 页面结构：欢迎页 + 通话页 + 设置弹窗 + BGM控制 |
| `public/style.css` | ~450 行 | 所有样式 + 情绪动画 CSS keyframes + 记忆管理UI |
| `public/app.js` | ~600 行 | **核心逻辑**，详见下方 |
| `public/memory-system.js` | ~250 行 | 三层记忆架构（短期/摘要/关键记忆） |
| `public/nlu.js` | ~200 行 | 自然语言意图解析器 |

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
  ├─ callAPI()              ← 发给 LLM
  ├─ parseEmotion()         ← 从回复中提取 [emotion:xxx] 标签
  ├─ setEmotion(emotion)    ← 切换立绘 + 触发粒子特效
  ├─ speakEdgeTTS(text)     ← TTS 语音播放（立绘保持不变）
  ├─ switchBGM(mood)        ← 根据情绪切换BGM
  └─ 兜底：用户要求了情绪但AI没给标签 → 前端强制切

endCall()                   ← 点击"结束通话"触发
  ├─ MemorySystem.generateSummary()  ← LLM 生成本次对话摘要
  └─ MemorySystem.extractKeyMemory() ← LLM 提取关键信息

setEmotion(emotion)         ← 立绘切换引擎
  ├─ 更新 data-emotion 属性（CSS动画自动切换）
  ├─ 切换图片 src（如果有对应情绪的立绘）
  ├─ spawnParticles()       ← 触发粒子特效（星星/爱心/💢等）
  └─ 5秒后无操作自动回 idle

speakEdgeTTS(text)          ← 语音播放
  ├─ 创建 Audio 对象指向 /api/tts
  ├─ onplay → 加 is-speaking 浮动动画类
  ├─ onended → 移除浮动动画 → 回 idle
  └─ 错误时也显示文字气泡

BGM 模块
  ├─ getOrCreateBgmAudio() ← 缓存 Audio 实例（不复建）
  ├─ playBGM()              ← 淡入播放（支持 mood 切换）
  ├─ pauseBGM()             ← 记录 currentTime 后暂停
  ├─ resumeBGM()            ← 从断点续播
  └─ stopBGM()              ← 淡出停止
```

---

## 三、关键设计决策（为什么这么写）

### Q1: 为什么情绪标签格式要兼容多种变体？
AI 模型输出的 `[emotion:xxx]` 格式不稳定，有时输出 `[shy]`、`[shy:害羞]`、`[emotion:shy:害羞]` 等。正则用了 `(?::[^\]]*?)?` 来兼容所有变体。

### Q2: 为什么立绘切换和 TTS 不用 setEmotion('talking') 覆盖？
之前踩过坑：先切目标情绪立绘 → TTS onplay 又覆盖成 talking → 立绘闪回默认。现在的方案是：setEmotion(emotion) 显示正确立绘 → TTS 只加 is-speaking 浮动动画 class → 两者不冲突。

### Q3: 为什么用户要求的情绪要做两层判断？
第一层：前端正则检测用户关键词 → 追加提示给 AI。第二层：AI 回复后检查是否给了情绪标签 → 如果没给（AI 忽略了），前端兜底强制切。这样无论 AI 配合不配合，立绘都会响应。

### Q4: BGM 为什么用实例池而不是每次 new Audio()？
为了实现断点续播。每次 new Audio() 会丢失播放位置。用 bgmAudioPool[mood] 缓存实例，暂停时记录 currentTime，恢复时从该位置继续。

### Q5: 记忆系统为什么分三层？
- 短期记忆：直接塞 context，LLM 能精确引用最近对话
- 摘要记忆：压缩旧对话，让 AI 有"模糊记忆"
- 关键记忆：永久记住重要信息（喜好/承诺），不会被滚动删除

### Q6: NLU 为什么用正则而不是调 LLM？
速度和成本。每条消息都调 LLM 做意图分类太慢太贵。正则覆盖常见模式够用，识别不了的降级为普通聊天。

---

## 四、已知问题 & 待改进

| # | 问题 | 状态 | 建议 |
|---|------|------|------|
| 1 | TTS 是 Edge TTS，效果一般 | 待替换 | 接入 Azure Neural TTS / Fish Audio |
| 2 | 2D 立绘不是 3D | Phase 1 后解决 | 等少爷的 Unity 3D 角色 |
| 3 | 没有用户系统 | Phase 5 | 多角色/素材库需要 |
| 4 | 没有移动端适配 | Phase 4 | 当前只适合桌面浏览器 |
| 5 | 记忆系统的摘要生成依赖 LLM，可能失败 | 已做 try-catch 降级 | 失败时不影响对话，只是没有摘要 |
| 6 | NLU 动作指令目前只能显示占位文字 | Phase 3 后解决 | 等 Unity 动画序列 |

---

## 五、开发环境

```bash
# 启动
cd ai-companion
npm install
npm start
# 打开 http://localhost:3000

# Git 代理（Clash Verge Rev）
git config http.proxy http://127.0.0.1:7897
git config https.proxy http://127.0.0.1:7897
```

---

## 六、下一步做什么（按优先级）

1. **Phase 1**（少爷在做）→ Unity 3D 角色基础
2. **Phase 2** → 对话 + 表情联动（需要 Unity Blend Shapes + 口型同步）
3. **Phase 3** → 复杂交互动作序列（NLU 已就绪，等 Unity 动画）
4. **记忆系统** → ✅ 已完成，可在当前 2D 版本验证
5. **NLU 解析器** → ✅ 已完成，基础版可用
6. **语音升级** → 从 Edge TTS 升级到情绪 TTS

---

## 七、编码约定

- 所有 JS 用 IIFE 封装：`(function () { 'use strict'; ... })();`
- 中文注释
- 配置对象用 `config` 全局变量，持久化到 localStorage
- UI 操作统一用 `$ = (s) => document.querySelector(s)` 和 `$$ = (s) => document.querySelectorAll(s)`
- 新增功能模块导出为独立文件（如 memory-system.js、nlu.js），通过 `<script>` 引入顺序依赖
- 不要破坏现有功能！所有改动都是增量添加
