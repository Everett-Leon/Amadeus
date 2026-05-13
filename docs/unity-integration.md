# Unity 集成指南

> AI Companion 3D 版本 — Unity 侧开发参考文档

---

## 一、项目架构总览

```
┌─────────────────────────────────────────────────┐
│                 AI Companion                     │
├──────────────┬──────────────┬───────────────────┤
│  2D 原型     │  后端服务    │  Unity 3D 场景     │
│  (Web)       │  (Node.js)  │  (WebGL Build)    │
├──────────────┼──────────────┼───────────────────┤
│ index.html   │ server.js   │ Scene.unity        │
│ app.js       │ /api/chat   │ EmotionController  │
│ style.css    │ /api/tts    │ ActionController   │
│ nlu.js       │ /api/upload │ TTSPlayer          │
│ memory-sys.js│             │ ChatManager        │
│ unity-bridge │             │ MemoryManager      │
│              │             │ LipSyncController   │
│              │             │ SceneController    │
└──────────────┴──────────────┴───────────────────┘
```

### 两套前端的关系

- **2D 原型**：使用图片立绘 + CSS 动画，直接浏览器运行，用于快速验证交互逻辑
- **Unity 3D**：使用 3D 模型 + BlendShapes + Animator，导出为 WebGL，提供沉浸式体验
- **共用后端**：两个前端共享同一个 Node.js 后端（AI 对话、TTS、文件上传）
- **桥接层**：`unity-bridge.js` 在 Unity WebGL 环境中自动启用，在普通浏览器中静默降级

---

## 二、后端 API 接口文档

### 2.1 AI 对话 — `POST /api/chat`

**功能**：将用户消息发送给 LLM，获取 AI 回复

**请求体**：

```json
{
  "apiUrl": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  "apiKey": "your-api-key",
  "model": "glm-4-flash",
  "messages": [
    { "role": "system", "content": "你叫小雪..." },
    { "role": "user", "content": "你好呀" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| apiUrl | string | ✅ | LLM API 地址 |
| apiKey | string | ✅ | API 密钥 |
| model | string | ✅ | 模型名称 |
| messages | array | ✅ | 对话历史（OpenAI 格式） |

**响应**：直接转发 LLM 的原始响应（OpenAI 兼容格式）

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "你好呀～（这是我说的第一句话呢）[emotion:happy]"
      }
    }
  ]
}
```

> ⚠️ AI 回复中包含 `[emotion:xxx]` 格式的情绪标签，Unity 侧需解析。

---

### 2.2 语音合成 — `GET /api/tts`

**功能**：使用 Edge TTS 将文本转为语音

**请求参数**（Query String）：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| text | string | ✅ | — | 要合成的文本（最大 500 字） |
| voice | string | ❌ | zh-CN-XiaoxiaoNeural | 声线 ID |
| rate | string | ❌ | +0% | 语速 |
| pitch | string | ❌ | +0Hz | 音调 |

**响应**：`audio/mpeg` 格式的 MP3 音频流

**可用声线**：

| ID | 名称 | 风格 |
|----|------|------|
| zh-CN-XiaoxiaoNeural | 晓晓 | 年轻女性，自然亲切 |
| zh-CN-XiaomoNeural | 晓梦 | 少女声线，甜美可爱 |
| zh-CN-XiaoyiNeural | 晓依 | 温柔女性，柔和细腻 |
| zh-CN-XiaoruiNeural | 晓瑞 | 活泼女性，元气满满 |
| zh-CN-XiaohanNeural | 晓涵 | 知性女性，清晰大方 |
| zh-CN-XiaoshuangNeural | 晓双 | 小女孩声线，稚嫩可爱 |
| zh-CN-XiaozhenNeural | 晓甄 | 成熟女性，稳重优雅 |

---

### 2.3 文件上传 — `POST /api/upload`

**功能**：上传文件到服务器

**请求体**：

```json
{
  "name": "bgm-happy.mp3",
  "data": "base64编码的文件内容（不含前缀）"
}
```

**响应**：

```json
{
  "url": "/uploads/1715400000-a3b2c1.mp3",
  "name": "bgm-happy.mp3"
}
```

---

## 三、Unity 侧组件设计

### 3.1 EmotionController — 表情控制器

**挂载到**：场景中的 `EmotionController` GameObject

**职责**：接收 JS 端的表情指令，通过 BlendShapes 控制角色面部表情

**接口方法**（通过 `SendMessage` 被 JS 调用）：

```csharp
// 设置单个情绪表情
public void SetEmotion(string jsonPayload)
{
    // 解析 JSON: { "emotionId": "happy", "intensity": 1.0 }
    // 根据 emotionId 映射到对应的 BlendShape 组合
    // 使用 DOTween 插值过渡到目标 BlendShape 值
}

// 设置混合表情（多个 BlendShape 叠加）
public void SetBlendExpression(string jsonPayload)
{
    // 解析 JSON: [{ "id": "blush", "weight": 0.8 }, ...]
    // 同时设置多个 BlendShape 的权重
}
```

**需要挂载的引用**：
- `SkinnedMeshRenderer` — 角色面部网格（用于控制 BlendShapes）

**情绪 ID 映射表**：

| emotion_id | 建议的 BlendShape 组合 |
|------------|----------------------|
| idle | neutral/mouth_close + 眼睛默认状态 |
| happy | mouth_smile + eye_smile + cheek_puff |
| shy | blush + eye_look_away + mouth_smile_small |
| sad | eyebrow_sad + eye_sad + mouth_sad |
| angry | eyebrow_angry + eye_angry + mouth_grimace |
| surprised | eyebrow_raised + eye_wide + mouth_open |
| thinking | eye_look_up + mouth_small + head_tilt |
| embarrassed | blush + eye_sweatdrop + mouth_wavy |

详细映射见 → `blendshape-mapping.md`

---

### 3.2 ActionController — 动作控制器

**挂载到**：场景中的 `ActionController` GameObject

**职责**：接收 JS 端的动作指令，通过 Animator 控制角色动作

**接口方法**：

```csharp
// 触发动作
public void TriggerAction(string jsonPayload)
{
    // 解析 JSON: { "actionId": "wave", "duration": 0, "loop": false, "emotion": null }
    // 设置 Animator Trigger
    // 如果有 duration，启动协程在指定秒数后回归 Idle
    // 如果有关联 emotion，同时调用 EmotionController
}

// 取消动作
public void CancelAction()
{
    // 重置所有动作 Trigger，回归 Idle 状态
}

// 播放入场动画
public void PlayEntrance(string entranceId)
{
    // 如果 entranceId == "random"，从入场动画池中随机选择
    // 否则播放指定 ID 的入场动画
    // 播放完毕后回归 Idle
}
```

**需要挂载的引用**：
- `Animator` — 角色 Animator Controller
- `EmotionController` — 表情控制器引用（用于动作关联表情）

**动作 ID 映射表**：

| action_id | Animator Trigger | 说明 | 关联情绪 |
|-----------|-----------------|------|----------|
| wave | Trigger_Wave | 挥手 | happy |
| bow | Trigger_Bow | 鞠躬 | idle |
| nod | Trigger_Nod | 点头 | idle |
| headpat | Trigger_Headpat | 摸头 | shy |
| headtilt | Trigger_HeadTilt | 歪头 | thinking |
| sigh | Trigger_Sigh | 叹气 | sad |
| clap | Trigger_Clap | 拍手 | happy |
| stretch | Trigger_Stretch | 伸懒腰 | idle |
| sing | Trigger_Sing | 唱歌 | happy |
| dance | Trigger_Dance | 跳舞 | happy |
| walk_away | Trigger_WalkAway | 走开 | shy |
| come_back | Trigger_ComeBack | 回来 | idle |
| read_book | Trigger_ReadBook | 读书 | thinking |

---

### 3.3 TTSPlayer — 语音播放器

**挂载到**：场景中的 `TTSPlayer` GameObject

**职责**：调用 `/api/tts` 获取语音，播放时同步口型

```csharp
// 播放 TTS 语音
public async void Speak(string text, string voice = "zh-CN-XiaoxiaoNeural")
{
    // 1. 通过 UnityWebRequest 调用 /api/tts?text=...&voice=...
    // 2. 将返回的 MP3 加载到 AudioSource
    // 3. 播放音频
    // 4. 同时启动口型同步协程
    // 5. 播放完毕后通知 JS 端
}

// 停止播放
public void StopSpeaking()
{
    // 停止 AudioSource，重置口型
}
```

**口型同步方案**：
- 简单方案：播放时循环在几个口型 BlendShape 之间切换（aa → ou → ee → oh）
- 精确方案：使用音素分析库（如 Rhubarb Lip Sync）生成 Viseme 时间轴

---

### 3.4 ChatManager — 对话管理器

**挂载到**：场景中的 `ChatManager` GameObject

**职责**：管理对话流程，调用 API，解析 AI 回复

```csharp
// 发送用户消息
public async void SendUserMessage(string text)
{
    // 1. 将用户消息添加到对话历史
    // 2. 构建包含记忆上下文的 system prompt
    // 3. 调用 /api/chat
    // 4. 解析 AI 回复中的 [emotion:xxx] 标签
    // 5. 调用 EmotionController 设置表情
    // 6. 调用 TTSPlayer 播放语音
    // 7. 更新 UI（气泡文字等）
}
```

---

### 3.5 LipSyncController — 口型控制器

**挂载到**：场景中的 `LipSyncController` GameObject

**职责**：接收 JS 端或 TTSPlayer 发来的口型指令

```csharp
// 设置当前音素
public void SetViseme(string jsonPayload)
{
    // 解析 JSON: { "viseme": "aa", "weight": 1.0 }
    // 设置对应的 BlendShape（如 blendShape_mouth_aa）
    // 使用 DOTween 平滑过渡
}
```

---

### 3.6 SceneController — 场景控制器

**挂载到**：场景中的 `SceneController` GameObject

**职责**：管理背景场景切换

```csharp
// 切换场景
public void SetScene(string sceneId)
{
    // 根据场景 ID 切换背景
    // 支持: bedroom, library, park, night, sakura, custom
    // 使用渐变过渡
}
```

---

## 四、VRM 模型导入流程

### 步骤

1. **安装 VRoid Studio** → https://vroid.cn
2. **创建角色**（参考三鹰朝风格：短发、眼镜、校服）
3. **导出 VRM** → VRoid Studio → File → Export as VRM
4. **Unity 新建项目** → Unity 2022.3.x LTS
5. **安装 UniVRM** → https://github.com/vrm-c/UniVRM（通过 git URL 安装到 Package Manager）
6. **导入 VRM 文件** → 将 .vrm 文件拖入 Assets
7. **双击 VRM 文件** → UniVRM 自动生成 Prefab，包含：
   - SkinnedMeshRenderer（带 BlendShapes）
   - 骨骼结构（Humanoid）
   - 物理摆动（PhysBone / VRMSpringBone）
8. **将 Prefab 拖入场景**

### VRM 标准 BlendShapes

UniVRM 自动映射的 VRM 标准表情：

| BlendShape 名称 | 用途 |
|----------------|------|
| neutral | 中性表情 |
| aa | 嘴巴张开（啊） |
| ih | 嘴巴微张（伊） |
| ou | 嘴巴收圆（哦） |
| ee | 嘴巴咧开（诶） |
| oh | 嘴巴张圆（哦） |
| blink | 眨眼 |
| blink_l | 左眼眨 |
| blink_r | 右眼眨 |
| happy | 开心 |
| angry | 生气 |
| sad | 难过 |
| relaxed | 放松 |
| surprised | 惊讶 |
| look_up | 向上看 |
| look_down | 向下看 |
| look_left | 向左看 |
| look_right | 向右看 |

---

## 五、WebGL 打包注意事项

### 必须配置

1. **Player Settings → WebGL**
   - Compression Format: Brotli
   - Code Optimization: Master (or Release)
   - Data Compression: Enabled

2. **Template 修改**
   - 在 WebGL 模板的 `index.html` 中引入 `unity-bridge.js`
   - 确保 `createUnityInstance` 回调中正确设置全局引用

3. **后端通信**
   - WebGL 构建必须与 Node.js 后端同源部署（或配置 CORS）
   - 推荐方案：Unity WebGL → Nginx 反向代理 → Node.js 后端

4. **内存限制**
   - WebGL 默认内存 256MB，如模型较大需增加到 512MB+
   - Player Settings → WebGL → Memory Size

5. **音频格式**
   - WebGL 不支持所有音频格式，TTS 的 MP3 需要确保浏览器支持
   - 备选方案：后端同时提供 WAV 格式

### 部署架构

```
浏览器
  ↓
Nginx (静态资源 + 反向代理)
  ├── /              → Unity WebGL 构建（静态文件）
  ├── /api/chat      → Node.js 后端 :3000
  ├── /api/tts       → Node.js 后端 :3000
  └── /api/upload    → Node.js 后端 :3000
```
