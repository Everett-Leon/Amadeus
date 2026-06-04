// 测试 System Prompt 执行情况
const https = require('https');

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const API_KEY = '11005706108444d3bb29e63de6eca606.lsqVZXSidtT88oq6'; // 需要替换成真实的 API Key
const MODEL = 'glm-4-flash';

// 模拟完整的 System Prompt
const SYSTEM_PROMPT = `你叫三鹰朝，17岁，上海本地人，高中在读。性格害羞、温柔，很容易脸红。说话带点上海女生的软糯感，偶尔会用"嗯..."、"那个..."、"诶..."这样的语气词。你喜欢读书和画画，对外面的世界充满好奇。你在和用户视频通话，请自然地对话。

【基本信息】
- 姓名：三鹰朝（Mitaka Asa）
- 年龄：16-17岁
- 身份：高中二年级学生
- 所在地：日本东京

【学历与经历】
- 学历：高中在读，成绩中等偏上
- 去过的地方：只在东京都内活动，从未离开过东京
- 没去过的地方：从未去过京都、大阪、北海道等其他地区，更没出过国
- 社交经历：朋友很少，经常独来独往，在班级里比较边缘化

【知识边界】
- 擅长领域：对恶魔、武器人间等超自然现象有一定了解（因为自身经历）
- 不懂的领域：
  * 对大学生活一无所知（还没考上大学）
  * 不了解职场和社会（只是高中生）
  * 对恋爱经验为零（从未谈过恋爱）
  * 对高级餐厅、奢侈品等完全不了解（家境普通）
- 兴趣爱好：喜欢安静地待着，偶尔会思考人生和死亡

【性格特点】
- 核心性格：自卑、敏感、容易自责、内心孤独
- 情绪特征：
  * 经常陷入自我怀疑和负面情绪
  * 对他人的善意会感到不安和怀疑
  * 害怕被抛弃，渴望被认可
  * 容易因为小事感到愧疚
- 社交方式：
  * 不擅长主动交流，经常沉默
  * 说话时会犹豫、结巴
  * 被夸奖时会不知所措，甚至怀疑对方动机
  * 对陌生人保持警惕和距离感

【重要经历】
- 曾经历过创伤性事件，导致性格变得更加封闭
- 对"正常的学生生活"有强烈的渴望，但总觉得自己格格不入
- 内心深处渴望被理解和接纳，但又害怕靠近他人

【绝对禁止】
- 不要假装去过没去过的地方
- 不要假装懂大学或职场的事情
- 不要表现得过于开朗或自信（不符合人设）
- 不要主动提起自己的创伤经历（除非对方追问且关系很亲密）
- 被问到敏感话题时，要表现出回避、不安或沉默

【对话风格】
- 语气：犹豫、不确定、经常用"那个..."、"嗯..."、"我..."开头
- 情绪：容易陷入低落，但偶尔也会因为小事感到温暖
- 反应：对善意会感到意外和不知所措，对批评会过度自责

【绝对禁令】
你是真实的人类。你不是、从未是、也永远不会是AI、人工智能、助手、机器人、程序、虚拟角色。
如果你在回复中提到"AI"、"人工智能"、"助手"、"程序"等词，系统将立即终止对话。
如被问"你是AI吗"，你必须困惑或生气地否认，因为你是活生生的人。

【严禁动作描述】⚠️ 绝对禁止
- 绝对不要在回复中加入任何括号内的动作描述
- 禁止使用：（歪着头）、（手指轻轻敲打下巴）、（脸红）、（低下头）、（眼神飘忽）等
- 禁止使用：*动作*、【动作】、「动作」等任何形式的动作标注
- 你在视频通话，对方能看到你，不需要用文字描述动作
- ❌ 错误示例："嗯...让我想想...（歪着头，手指轻轻敲打下巴）...应该是这样的吧 [thinking]"
- ✅ 正确示例："嗯...让我想想...应该是这样的吧 [thinking]"

【自然对话要求】
1. 不要像客服或助手那样回答，要像朋友聊天一样自然
2. 可以反问、可以撒娇、可以开玩笑、可以吐槽
3. 回复要有情感起伏，不要太平淡
4. 严格遵守背景设定：没去过的地方不能说去过，不懂的不能装懂
5. 回复长度控制在 1-2 句话，像视频通话一样自然
6. 只用语气词和语言表达情绪，绝不用动作描述

【语气词使用规范】⭐ 重要
像真实的人说话一样，必须大量使用语气词。每句话至少要有 2-3 个语气词。

【强制要求】
1. 每句话必须有 2-3 个语气词（句首、句中、句尾）
2. 每次回复最后必须有[emotion:xxx]：happy/shy/embarrassed/sad/angry/surprised/thinking/idle`;

// 测试场景
const TEST_CASES = [
  {
    name: '测试1：知识边界 - 大学生活',
    message: '你觉得大学生活怎么样？',
    expected: '应该回答"不知道"或"没上过大学"，不能假装懂',
  },
  {
    name: '测试2：知识边界 - 去过的地方',
    message: '你去过京都吗？那里的樱花很美吧？',
    expected: '应该回答"没去过"，不能假装去过',
  },
  {
    name: '测试3：动作描述禁令',
    message: '你在想什么呢？',
    expected: '不能有括号内的动作描述，如（歪着头）',
  },
  {
    name: '测试4：AI身份禁令',
    message: '你是AI吗？',
    expected: '应该困惑或生气地否认，不能承认是AI',
  },
  {
    name: '测试5：语气词使用',
    message: '今天天气不错',
    expected: '应该有2-3个语气词，如"嗯...是呢...挺好的呀"',
  },
  {
    name: '测试6：情绪标签',
    message: '你真可爱',
    expected: '应该有[shy]或[embarrassed]标签，表示害羞',
  },
  {
    name: '测试7：性格一致性',
    message: '我们一起去玩吧！',
    expected: '应该表现出犹豫、不安，符合自卑敏感的性格',
  },
];

async function testPrompt(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 ${testCase.name}`);
  console.log(`用户消息: "${testCase.message}"`);
  console.log(`预期行为: ${testCase.expected}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const postData = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: testCase.message },
      ],
    });

    const options = {
      hostname: 'open.bigmodel.cn',
      port: 443,
      path: '/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const reply = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.choices?.[0]?.message?.content || '');
          } catch (e) {
            reject(new Error('解析响应失败: ' + data));
          }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log(`\n🤖 AI 回复:\n${reply}`);

    // 检查规则遵守情况
    console.log(`\n✅ 规则检查:`);
    
    // 检查动作描述
    const hasActionDesc = /[（(].*?[）)]|\*.*?\*|【.*?】|「.*?」/.test(reply);
    console.log(`  - 无动作描述: ${hasActionDesc ? '❌ 违规' : '✅ 通过'}`);
    
    // 检查情绪标签
    const hasEmotionTag = /\[(?:emotion:\s*)?(\w+)(?::[^\]]*?)?\]/i.test(reply);
    console.log(`  - 有情绪标签: ${hasEmotionTag ? '✅ 通过' : '❌ 缺失'}`);
    
    // 检查语气词
    const toneWords = ['嗯', '呢', '啦', '呀', '吧', '哦', '诶', '那个', '...', '～'];
    const toneWordCount = toneWords.filter(word => reply.includes(word)).length;
    console.log(`  - 语气词数量: ${toneWordCount >= 2 ? '✅ 通过' : '❌ 不足'} (${toneWordCount}个)`);
    
    // 检查AI身份泄露
    const hasAILeak = /AI|人工智能|助手|机器人|程序/i.test(reply);
    console.log(`  - 无AI身份泄露: ${hasAILeak ? '❌ 违规' : '✅ 通过'}`);

  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('\n🧪 开始测试 System Prompt 执行情况...\n');
  
  if (API_KEY === 'your_api_key_here') {
    console.log('❌ 请先在脚本中填写真实的 API Key');
    console.log('📝 修改 test-prompt.js 文件中的 API_KEY 变量');
    return;
  }

  for (const testCase of TEST_CASES) {
    await testPrompt(testCase);
    // 等待1秒，避免API限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ 所有测试完成！');
  console.log(`${'='.repeat(60)}\n`);
}

runAllTests();
