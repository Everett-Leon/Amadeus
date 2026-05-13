# BlendShape 映射参考

> AI Companion 项目 — 表情/口型 BlendShape 与情绪 ID 的映射文档

---

## 一、情绪 ID → BlendShape 映射表

以下映射适用于大多数 VRChat / BOOTH 动漫角色模型。不同模型的 BlendShape 名称可能略有差异，需要在 Unity 中对照实际模型的 BlendShape 列表调整。

### 1.1 基础情绪

| emotion_id | 中文 | VRM 标准 BlendShape | BOOTH 模型常见 BlendShape | 说明 |
|------------|------|---------------------|--------------------------|------|
| **idle** | 平静 | neutral | neutral / face_default | 默认表情，所有 BlendShape 归零 |
| **happy** | 开心 | happy | smile / mouth_smile / eye_smile | 嘴角上扬 + 眼睛微眯 |
| **shy** | 害羞 | — | blush / eye_shy_down / mouth_w_smile | 脸红 + 视线偏下 + 嘴角微上 |
| **sad** | 难过 | sad | eyebrow_sad / eye_sad / mouth_down | 眉毛下垂 + 眼睛低垂 + 嘴角下垂 |
| **angry** | 生气 | angry | eyebrow_angry / eye_angry / mouth_grimace | 眉毛压低 + 眼睛瞪 + 咬牙 |
| **surprised** | 惊讶 | surprised | eyebrow_up / eye_wide / mouth_open_big | 眉毛上扬 + 眼睛睁大 + 嘴巴张开 |
| **thinking** | 思考 | — | eye_look_up / mouth_small / head_tilt | 眼睛向上看 + 嘴巴微张 + 头微歪 |
| **embarrassed** | 尴尬 | — | blush / sweatdrop / eye_uneven | 脸红 + 汗滴 + 眼神游移 |

### 1.2 微表情组合（setBlendExpression 用）

复杂的情绪通常需要多个 BlendShape 叠加。以下是推荐组合：

#### 😳 害羞（强烈）

```json
[
  { "id": "blush", "weight": 0.9 },
  { "id": "eye_look_away", "weight": 0.7 },
  { "id": "mouth_smile_small", "weight": 0.5 },
  { "id": "eyebrow_sad", "weight": 0.3 }
]
```

> 眼睛不敢直视 + 脸红 + 嘴角微上 + 眉毛微微下垂

#### 😊 开心（自然微笑）

```json
[
  { "id": "mouth_smile", "weight": 0.8 },
  { "id": "eye_smile", "weight": 0.6 },
  { "id": "cheek_puff", "weight": 0.3 }
]
```

#### 😢 伤心（难过低落）

```json
[
  { "id": "eyebrow_sad", "weight": 0.7 },
  { "id": "eye_sad", "weight": 0.6 },
  { "id": "mouth_down", "weight": 0.5 },
  { "id": "eye_look_down", "weight": 0.4 }
]
```

#### 😠 生气（轻微不悦）

```json
[
  { "id": "eyebrow_angry", "weight": 0.6 },
  { "id": "eye_angry", "weight": 0.5 },
  { "id": "mouth_grimace", "weight": 0.4 }
]
```

#### 😲 惊讶（突然吃惊）

```json
[
  { "id": "eyebrow_up", "weight": 1.0 },
  { "id": "eye_wide", "weight": 0.9 },
  { "id": "mouth_open_big", "weight": 0.8 }
]
```

#### 🤔 思考（犹豫）

```json
[
  { "id": "eye_look_up_right", "weight": 0.7 },
  { "id": "mouth_small", "weight": 0.4 },
  { "id": "eyebrow_worry", "weight": 0.3 }
]
```

#### 😣 尴尬（左右为难）

```json
[
  { "id": "blush", "weight": 0.5 },
  { "id": "mouth_wavy", "weight": 0.6 },
  { "id": "eye_sweat", "weight": 0.4 },
  { "id": "eyebrow_uneven", "weight": 0.3 }
]
```

---

## 二、口型同步（Viseme）映射

### 2.1 VRM 标准 Viseme

| 音素 | BlendShape 名称 | 发音参考 | 对应汉语 |
|------|----------------|----------|----------|
| — | neutral | 闭嘴/静默 | — |
| AA | aa | 啊 | a / a |
| IH | ih | 伊 | i / yi |
| OU | ou | 哦 | ou / u |
| EE | ee | 诶 | e / ei |
| OH | oh | 喔 | o / uo |

### 2.2 Edge TTS 简化口型方案

由于 Edge TTS 不直接输出 Viseme 时间轴，采用简化方案：

```csharp
// 在 TTS 播放期间，使用协程循环切换口型
IEnumerator AnimateLipSync(AudioSource audioSource)
{
    string[] visemes = { "aa", "ih", "ou", "ee", "oh", "aa", "ih", "ee", "ou", "oh" };
    float interval = 0.12f; // 每个音素持续 120ms

    while (audioSource.isPlaying)
    {
        foreach (string viseme in visemes)
        {
            SetViseme(viseme, Random.Range(0.3f, 0.8f));
            yield return new WaitForSeconds(interval);
        }
    }
    SetViseme("neutral", 0); // 播放结束，闭嘴
}
```

### 2.3 高级方案（可选）

如需精确口型同步，推荐使用以下方案之一：

1. **Rhubarb Lip Sync**（免费）
   - https://github.com/auburn/rhubarb-lip-sync
   - 输入音频 WAV → 输出 Viseme 时间轴 JSON
   - 支持 Unity 插件

2. **Oculus LipSync**（免费）
   - Meta 提供，实时音素检测
   - 需要 Oculus SDK 依赖

3. **Salsa LipSync Suite**（付费）
   - Unity Asset Store 上的商业插件
   - 支持多种音频源

---

## 三、BOOTH 模型常见 BlendShape 分类

### 3.1 面部表情类（Face / Expression）

| 类别 | 常见 BlendShape 名称 | 数量范围 |
|------|---------------------|----------|
| 基础表情 | smile, angry, sad, surprised, neutral | 5~10 |
| 眉毛 | eyebrow_up, eyebrow_down, eyebrow_angry, eyebrow_sad, eyebrow_worry | 5~15 |
| 眼睛 | eye_close, eye_wide, eye_smile, eye_sad, eye_angry, eye_look_up/down/left/right | 10~30 |
| 嘴巴 | mouth_aa, mouth_ih, mouth_ou, mouth_ee, mouth_smile, mouth_open, mouth_down | 10~25 |
| 脸红 | blush, blush_light, blush_heavy | 1~5 |
| 汗滴 | sweatdrop, sweat | 1~3 |
| 特殊 | eye_heart, eye_spiral, eye_star, tongue_out, eye sparkle | 5~20 |

### 3.2 MMD 兼容类

VRChat/BOOTH 模型通常包含 MMD 兼容的 BlendShapes：

| BlendShape | 说明 |
|-----------|------|
| まばたき (blink) | 眨眼 |
| 笑い (smile) | 微笑 |
| 喜び (joy) | 喜悦 |
| 怒り (anger) | 愤怒 |
| 悲しみ (sorrow) | 悲伤 |
| にやり (smirk) | 得意的笑 |
| はぁと (surprised) | 惊讶 |
| 眨き左/右 (blink_l/r) | 单眼眨 |
| あ / い / う / え / お | 口型（对应 AA/IH/OU/EE/OH） |
| きゅん (kyun) | 心动 |
| わーい (yay) | 欢呼 |

### 3.3 身体/衣装类

| 类别 | 常见名称 | 用途 |
|------|----------|------|
| 素体 | Breast_big, Breast_small, Waist_narrow | 换装兼容 |
| 发型 | Hair_style_A/B/C | 多发型切换 |
| 眼镜 | glasses_on, glasses_off | 眼镜戴脱 |

### 3.4 调整/高级类

| 类别 | 常见名称 | 用途 |
|------|----------|------|
| 瞳孔 | pupil_big, pupil_small, pupil_heart | 瞳孔变化 |
| 脸型 | face_round, face_long, cheek_puff | 脸部微调 |
| 阴影 | shadow_on, shadow_off | 眼睛下方阴影 |

---

## 四、VRoid Studio 默认 BlendShape 清单

VRoid Studio 导出的 VRM 模型自带以下标准 BlendShapes：

### 表情

| BlendShape | 说明 |
|-----------|------|
| neutral | 中性 |
| happy | 开心 |
| angry | 生气 |
| sad | 难过 |
| relaxed | 放松 |
| surprised | 惊讶 |
| blink | 眨眼 |
| blink_l | 左眼眨 |
| blink_r | 右眼眨 |

### 口型

| BlendShape | 说明 |
|-----------|------|
| a | あ（啊） |
| i | い（伊） |
| u | う（乌） |
| e | え（诶） |
| o | お（哦） |

### 视线

| BlendShape | 说明 |
|-----------|------|
| look_up | 向上看 |
| look_down | 向下看 |
| look_left | 向左看 |
| look_right | 向右看 |

> ⚠️ VRoid 默认表情较少（仅 4 种基础情绪 + 眨眼 + 口型 + 视线），无法直接满足"捂嘴笑、脸红低头"等微表情需求。建议：
> - 简单方案：组合基础 BlendShape + 视线实现
> - 进阶方案：后期换 BOOTH 高质量模型（400+ ShapeKey）

---

## 五、三鹰朝风格角色适配建议

针对三鹰朝（Asa Mitaka）的视觉特征，建议以下表情优先级：

| 优先级 | 情绪 | 原因 | 必要 BlendShape |
|--------|------|------|----------------|
| ⭐⭐⭐ | idle（默认） | 大部分时间 | neutral, eye_default |
| ⭐⭐⭐ | thinking | 清冷/严肃气质的核心表现 | eye_look_away, mouth_small |
| ⭐⭐⭐ | embarrassed | 三鹰朝经常陷入的社交困境 | blush, eye_uneven, mouth_wavy |
| ⭐⭐ | surprised | 被意外事件惊到 | eyebrow_up, eye_wide, mouth_open |
| ⭐⭐ | angry | 少数暴躁时刻 | eyebrow_angry, eye_angry |
| ⭐ | happy | 偶尔的温柔时刻 | smile, eye_smile |
| ⭐ | shy | 罕见的害羞 | blush, eye_look_down, mouth_w_smile |
| ⭐ | sad | 伤心时刻 | eyebrow_sad, eye_sad |

---

## 六、调试工具

### Unity 编辑器内调试 BlendShape

1. 选中角色 Prefab → SkinnedMesh Renderer
2. 展开 BlendShapes 列表
3. 手动调整滑块查看效果
4. 记录下需要的 BlendShape 名称和数值组合

### 推荐调试流程

```
1. 导入模型到 Unity
2. 展开 SkinnedMeshRenderer → BlendShapes
3. 逐个测试每个 BlendShape 的视觉效果
4. 记录表情组合（截图 + 数值笔记）
5. 在 EmotionController 中配置映射
6. 运行时通过 UnityBridge.setExpression() 测试
```
