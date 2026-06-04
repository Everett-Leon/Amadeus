# 三鹰朝表情生成 Prompt 指南

## 基础设置（所有表情通用）

**正向 Prompt（保持角色一致性）：**
```
Asa Mitaka, Chainsaw Man, school uniform, white shirt, blue vest, black tie, black hair, purple eyes, upper body, transparent background, anime style, high quality, detailed
```

**负向 Prompt（避免不想要的元素）：**
```
background, scenery, multiple people, low quality, blurry, distorted, deformed, extra limbs, watermark, signature
```

**参数建议：**
- Sampling Steps: 30-50
- CFG Scale: 7-10
- Denoising Strength: 0.3-0.5（img2img 模式）
- Size: 保持原图尺寸或 512x768

---

## 各表情的 Prompt 修改

### 1. 😊 开心 (happy)
**添加到 Prompt：**
```
smiling, happy expression, bright eyes, cheerful, gentle smile, relaxed eyebrows
```

**表情特征：**
- 嘴角上扬，露出微笑
- 眼睛微微眯起，显得温柔
- 眉毛放松，略微上扬

---

### 2. 😳 害羞 (shy)
**添加到 Prompt：**
```
blushing, shy expression, embarrassed, looking away, red cheeks, timid, nervous smile, averted gaze
```

**表情特征：**
- 脸颊泛红
- 眼神躲闪，不敢直视
- 嘴巴微微张开或抿嘴
- 眉毛略微上扬

---

### 3. 😣 尴尬 (embarrassed)
**添加到 Prompt：**
```
awkward expression, uncomfortable, nervous, sweating, forced smile, tense eyebrows, uneasy
```

**表情特征：**
- 眉毛紧皱
- 眼神不安
- 嘴角僵硬或苦笑
- 可能有汗滴

---

### 4. 😢 难过 (sad)
**添加到 Prompt：**
```
sad expression, teary eyes, downcast, melancholic, frown, drooping eyebrows, sorrowful
```

**表情特征：**
- 眉毛下垂
- 眼睛湿润或含泪
- 嘴角下垂
- 眼神黯淡

---

### 5. 😠 生气 (angry)
**添加到 Prompt：**
```
angry expression, furrowed brows, glaring, annoyed, frown, intense gaze, irritated
```

**表情特征：**
- 眉毛紧皱，呈倒八字
- 眼神锐利，瞪视
- 嘴巴紧闭或微微张开
- 整体气氛紧张

---

### 6. 😲 惊讶 (surprised)
**添加到 Prompt：**
```
surprised expression, wide eyes, open mouth, shocked, astonished, raised eyebrows, startled
```

**表情特征：**
- 眼睛睁大
- 嘴巴张开（O 型）
- 眉毛上扬
- 整体表情夸张

---

### 7. 🤔 思考 (thinking)
**添加到 Prompt：**
```
thinking expression, contemplative, hand on chin, pondering, thoughtful gaze, slight frown, concentrated
```

**表情特征：**
- 眉毛微皱
- 眼神专注
- 嘴巴微微抿起
- 可能有手托腮的动作

---

## 推荐的免费 AI 绘画网站（无需注册）

### 1. ⭐ FreeArtGen（推荐）
- **网址**：https://www.freeartgen.com/
- **特点**：完全免费，无需注册，无限次数
- **支持**：文本生图，支持动漫风格
- **使用**：直接输入 Prompt 即可生成

### 2. Magic Studio AI Art Generator
- **网址**：https://magicstudio.com/ai-art-generator/
- **特点**：快速生成，无需登录
- **支持**：多种艺术风格，包括动漫

### 3. MagicHour.ai（Flux Schnell）
- **网址**：https://magichour.ai/tools/ai-anime-generator
- **特点**：超快速生成，专门针对动漫角色
- **支持**：无需注册，免费使用

### 4. 海艺 AI（中文界面）
- **网址**：https://www.haiyi.art/
- **特点**：中文界面，操作简单
- **支持**：免费生成，支持二次元风格

### 5. FreeForAI Draw
- **网址**：https://draw.freeforai.com/
- **特点**：无限制免费使用
- **支持**：AI 图像生成和编辑

---

## 使用步骤（以 FreeArtGen 为例）

### 方法 1：文本生图（推荐新手）

1. **访问网站**
   - 打开 https://www.freeartgen.com/

2. **输入 Prompt**
   - 在输入框中输入完整的 Prompt
   - 例如生成"开心"表情：
     ```
     Asa Mitaka from Chainsaw Man, school uniform, white shirt, blue vest, black tie, black hair, purple eyes, upper body, transparent background, anime style, high quality, detailed, smiling, happy expression, bright eyes, cheerful, gentle smile, relaxed eyebrows
     ```

3. **选择风格**
   - 选择 "Anime" 或 "Manga" 风格
   - 如果有 "Transparent Background" 选项，勾选它

4. **生成图片**
   - 点击生成按钮
   - 等待 10-30 秒

5. **下载保存**
   - 下载生成的图片
   - 重命名为对应的表情名称（如 `happy.png`）
   - 保存到 `expressions` 文件夹

### 方法 2：图生图（保持角色一致性）

如果网站支持上传参考图：

1. **上传原图**
   - 选择 `Image to Image` 或类似功能
   - 上传你的三鹰朝立绘

2. **输入修改 Prompt**
   - 只需要描述表情变化
   - 例如："change expression to happy, smiling, cheerful"

3. **调整强度**
   - 如果有 Strength 参数，设置为 0.3-0.5
   - 保持原图风格，只改表情

4. **生成并保存**
   - 点击生成
   - 下载并保存

---

## 文件命名规范

生成后请按以下格式命名：

- `happy.png` - 开心
- `shy.png` - 害羞
- `embarrassed.png` - 尴尬
- `sad.png` - 难过
- `angry.png` - 生气
- `surprised.png` - 惊讶
- `thinking.png` - 思考

---

## 注意事项

1. **保持透明背景**
   - 在 Prompt 中加入 `transparent background`
   - 如果生成的图片有背景，使用 remove.bg 或 Photoshop 去除

2. **保持角色一致性**
   - 使用 img2img 模式而不是 txt2img
   - Strength 不要设置太高（建议 0.3-0.5）
   - 保持原图的构图和姿势

3. **批量生成**
   - 可以一次生成多个版本
   - 选择最符合要求的保存

4. **后期处理**
   - 如果需要，可以用 Photoshop 微调
   - 确保所有图片尺寸一致
