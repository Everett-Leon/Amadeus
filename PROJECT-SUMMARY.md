# AI Companion 项目总结

> 最后更新：2026-05-19 09:05
> 本文档为会话连续性设计，每次新对话开始时应读取此文件

---

## 一、项目概述

**AI Companion**（内部代号 Amadeus）是一款模拟视频通话界面的 AI 对话应用，核心体验是与 3D 动漫角色进行实时对话，角色能根据对话内容做出表情和动作反馈。

- **GitHub**：https://github.com/Everett-Leon/Amadeus
- **本地路径**：`ai-companion/`（workspace 内）
- **详细规划**：`ai-companion/产品规划-2026-05-10.md`

### 五阶段演进路线

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 获取/创建 3D 角色模型 | 进行中（蕾塞模型素材就绪，待接入） |
| Phase 2 | 对话 + 表情/动作联动 | 代码框架已完成，已推GitHub（commit 4de4502） |
| Phase 3 | Unity 3D 场景 + WebGL 打包 | 待启动 |
| Phase 4 | AR + 移动端适配 | 规划中 |
| Phase 5 | C 端产品化 | 远期 |

### 当前技术栈

- **后端**：Node.js + Express（端口 3000）
- **前端（2D 原型）**：原生 HTML/CSS/JS，图片立绘做表情切换
- **AI 对话**：智谱 GLM-4-flash（OpenAI 兼容 API）
- **TTS**：Edge TTS（msedge-tts），默认声线 zh-CN-XiaoxiaoNeural
- **NLU**：自研意图解析器（10 种意图：show_emotion / action_sequence / sing / dance / walk_away / come_back / ask_memory / tell_story / chitchat 等）
- **记忆系统**：三层结构（短期记忆 / 摘要记忆 / 关键记忆），localStorage 持久化

### 关键 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST | AI 对话（转发 LLM，回复含 `[emotion:xxx]` 标签） |
| `/api/tts` | GET | Edge TTS 语音合成，返回 MP3 |
| `/api/upload` | POST | 文件上传（Base64），返回 URL |

---

## 二、角色模型方案（Phase 1）

### 设计方向

以 **三鹰朝（Asa Mitaka）** 为风格参考：
- 短发深色 bob 头
- 方框/圆框眼镜
- 校服风格（白衬衫 + 深色百褶裙）
- 清冷/严肃/微天然呆的性格

### 方案决策历程

1. **BOOTH 购买方案（Route B2）**：最初计划从 BOOTH 购买高质量原创 VRChat Avatar
   - 挑了 4 个候选：Shinano / Milltina / Chocolat / Manuka
   - 价格 ¥3,000–8,000 JPY（约 ¥140–380 RMB）
   - 问题：海外支付麻烦，需 PayPal 绑银联卡

2. **国内平替调查**：搜索了淘宝、闲鱼、B站等渠道
   - 结论：**国内平替不了** BOOTH 水平
   - 原因：BOOTH 模型有 400-600 个 BlendShapes、PhysBone、lilToon、LipSync 等完整生态，国内没有同等平台

3. **蕾塞 Blender 模型（BOOTH 购买）**：最终决定先买现成模型快速出 demo
   - 作者 Sulbi，电锯人 Reze，Blender 5.1.0，97K 面数
   - ⚠️ 使用条款禁止当 game avatar 用，个人学习/展示用途
   - Blender 已安装并学会了基础操作（渲染、灯光、透明背景）
   - 原图已渲染 1 张（透明背景、竖版 1024×1536）
   - AI 生成了 7 种表情（happy/shy/embarrassed/sad/angry/surprised/thinking）
   - 表情文件在 `uploads/expressions/reze_*.png`
   - **尚未接入 MVP**（上次写死路径导致问题，已回滚代码）

4. **VRM 模型（备选）**：ProfChaos 的 VRM 模型，14MB
   - 3 Mesh + 3 骨骼蒙皮，结构完整
   - **0 个 BlendShapes**，无表情
   - 可导入 Unity（UniVRM），需后续补表情

5. **VRoid Studio（长期方案）**：免费捏人
   - 官网：https://vroid.cn（中文站）
   - 导出 VRM → UniVRM 导入 Unity
   - 限制：默认 BlendShapes 较少，后期可换高质量模型

### VRoid 捏脸要点

| 部位 | 建议 |
|------|------|
| 脸型 | 偏窄长、下颌线条干净，清冷感 |
| 眼睛 | 不要太大，偏细长，瞳色深蓝或棕色 |
| 眉毛 | 略粗、微微下垂，严肃感 |
| 嘴巴 | 嘴唇薄、嘴角平直或微垂 |
| 头发 | 深色（黑/深棕），短发 bob 及肩，刘海遮眉毛 |
| 眼镜 | VRoid 支持配饰，加方框或圆框眼镜 |
| 体型 | 纤细偏瘦 |
| 衣服 | 校服风格 |

---

## 三、Phase 2 代码框架

### 新增文件

| 文件 | 路径 | 说明 |
|------|------|------|
| **Unity Bridge** | `public/unity-bridge.js` | Unity ↔ Web 桥接层，IIFE 模块，全局只暴露 `UnityBridge` |
| **集成指南** | `docs/unity-integration.md` | API 文档 + 6 个 Unity 组件设计 + VRM 导入 + WebGL 打包 |
| **BlendShape 映射** | `docs/blendshape-mapping.md` | 8 种情绪映射 + 微表情 JSON + 口型同步 + 三鹰朝适配优先级 |

### UnityBridge API 摘要

```javascript
UnityBridge.init()                          // 自动初始化，检测 Unity 环境
UnityBridge.isReady()                       // 是否在 Unity WebGL 中
UnityBridge.setExpression(emotionId, intensity)  // 设置表情（happy/shy/sad 等）
UnityBridge.setBlendExpression([...])        // 叠加多个 BlendShape
UnityBridge.triggerAction(actionId, params) // 触发动作（wave/bow/dance 等）
UnityBridge.cancelAction()                  // 取消动作，回归 Idle
UnityBridge.setViseme(viseme, weight)        // 口型同步
UnityBridge.setScene(sceneId)               // 切换背景
UnityBridge.on('actionComplete', cb)        // 注册回调
```

非 Unity 环境（普通浏览器）下所有调用静默降级（console.warn），不影响 2D 原型运行。

### Unity 侧需实现的 6 个组件

1. **EmotionController** — 表情控制，接收 emotionId → BlendShape 映射
2. **ActionController** — 动作控制，接收 actionId → Animator Trigger
3. **TTSPlayer** — 调用 /api/tts 播放语音，同步口型
4. **ChatManager** — 对话管理，调用 /api/chat，解析 [emotion:xxx] 标签
5. **LipSyncController** — 口型控制，Viseme → BlendShape
6. **SceneController** — 背景场景切换

---

## 四、已完成的工作清单

- [x] 2D 原型 MVP（可对话 + TTS 语音 + 记忆系统 + NLU 意图识别）
- [x] 产品规划文档（5 阶段演进路线）
- [x] BOOTH 模型市场调研（4 个候选 + 2 个被拒的 Asa 仿制模型）
- [x] 国内 3D 模型平台调研（结论：无法平替）
- [x] VRoid Studio 免费方案确定
- [x] Phase 2 代码框架（unity-bridge.js + 2 份文档），已推 GitHub
- [x] GitHub 仓库建立并推送
- [x] Blender 安装 + 基础操作学习
- [x] 蕾塞模型 Blender 原图渲染（1 张透明背景竖版 PNG）
- [x] AI 生成 7 种表情立绘（happy/shy/embarrassed/sad/angry/surprised/thinking）

## 五、待办事项

### 当前最优先
- [ ] 测试记忆系统（短期记忆、摘要、跨会话持久化）
- [ ] 把蕾塞立绘接入 MVP（通过设置页正常上传，不要写死路径）

### 少爷负责（Phase 1）
- [ ] 蕾塞模型 Blender 调表情（可选，目前用 AI 生成的 7 张够 MVP 用）
- [ ] 安装 Unity 2022.3.x LTS
- [ ] 安装 UniVRM 插件，导入模型
- [ ] 在 Unity 中测试模型效果

### 朝负责（Phase 2+）
- [x] 代码框架已就位
- [ ] 等 Unity 场景搭建后对接表情/动作系统
- [ ] 口型同步方案集成
- [ ] WebGL 打包与部署配置

---

## 六、关键约束

- BOOTH 模型要求：Unity 2022.3.x + VRCSDK 3.0 + lilToon shader
- BOOTH 支付：必须 PayPal（银联卡不能直接用），跨境手续费 3.5-4%
- 模型许可证：允许修改，禁止转售/再分发
- WebGL 内存限制：默认 256MB，大模型需 512MB+
- VRoid 默认 BlendShapes 有限（后期升级建议买 BOOTH 模型）
- Git 推送需要代理：`http://127.0.0.1:7897`（Clash Verge Rev）
