// =============================================
// AI Companion — 好感度系统
// =============================================
// 好感度系统：模拟真实的人际关系发展
// 用户不知道具体数值，只能通过 AI 语气感受
// =============================================

const AffectionSystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    maxAffection: 100,           // 最大好感度
    minAffection: 0,             // 最小好感度
    
    // 好感度分类上限
    companionshipMax: 60,        // 陪伴分上限
    closenessMax: 20,            // 拉近距离分上限
    comfortMax: 10,              // 安慰分上限
    romanceMax: 10,              // 恋爱分上限
    
    // 关系阶段阈值（异性）
    strangerThreshold: 0,        // 陌生人：0-39
    friendThreshold: 40,         // 朋友：40-59
    closeFriendThreshold: 60,    // 密友：60-79
    loverThreshold: 80,          // 恋人：80-100
    
    // 陪伴分增长速率
    companionshipRate: {
      perMessage: 0.3,           // 每条消息基础增长
      perMinute: 0.1,            // 每分钟对话增长
    },
    
    // 拉近距离分增长
    closenessGain: {
      talkAboutHobby: 1.0,       // 聊她的喜好
      compliment: 0.8,           // 恰到好处的赞美
      sharePersonal: 0.5,        // 分享个人信息
    },
    
    // 安慰分增长
    comfortGain: {
      comfort: 2.0,              // 安慰她
      encourage: 1.5,            // 鼓励她
    },
    
    // 恋爱分增长（好感度 ≥80 后）
    romanceGain: {
      flirt: 1.0,                // 暧昧话题
      romantic: 1.5,             // 浪漫话题
    },
    
    // 扣分机制
    penalty: {
      earlyFlirt: -2.0,          // 好感度 <80 时聊暧昧
      insult: -10.0,             // 羞辱
      abuse: -15.0,              // 辱骂
      sexual: -20.0,             // 色情内容
      ignore: -0.5,              // 长时间不理她（每天）
    },
    
    // 存储键
    storageKey: 'ai-companion-affection',
  };

  // ==================== 数据结构 ====================
  let affectionData = {
    total: 0,                    // 总好感度
    companionship: 0,            // 陪伴分
    closeness: 0,                // 拉近距离分
    comfort: 0,                  // 安慰分
    romance: 0,                  // 恋爱分
    
    messageCount: 0,             // 消息计数
    lastInteraction: null,       // 最后交互时间
    relationshipStage: 'stranger', // 关系阶段
    
    // 性别设置
    userGender: null,            // 用户性别（male/female）
    aiGender: null,              // AI 性别（male/female）
    isSameGender: false,         // 是否同性
  };

  // ==================== 初始化 ====================
  function init(userGender, aiGender) {
    // 加载已有数据
    load();
    
    // 设置性别
    affectionData.userGender = userGender || 'male';
    affectionData.aiGender = aiGender || 'female';
    affectionData.isSameGender = (affectionData.userGender === affectionData.aiGender);
    
    // 更新关系阶段
    updateRelationshipStage();
    
    // 保存
    save();
    
    console.log('[Affection] 好感度系统初始化:', {
      total: affectionData.total,
      stage: affectionData.relationshipStage,
      isSameGender: affectionData.isSameGender,
    });
  }

  // ==================== 核心功能 ====================
  
  /**
   * 处理用户消息，更新好感度
   * @param {string} userMessage - 用户消息
   * @param {string} aiEmotion - AI 当前情绪
   * @returns {Object} 好感度变化信息
   */
  function processMessage(userMessage, aiEmotion) {
    const changes = {
      companionship: 0,
      closeness: 0,
      comfort: 0,
      romance: 0,
      total: 0,
      reason: [],
    };
    
    // 1. 陪伴分：每条消息基础增长
    if (affectionData.companionship < CONFIG.companionshipMax) {
      const gain = CONFIG.companionshipRate.perMessage;
      affectionData.companionship = Math.min(
        affectionData.companionship + gain,
        CONFIG.companionshipMax
      );
      changes.companionship += gain;
      changes.reason.push(`陪伴 +${gain.toFixed(1)}`);
    }
    
    // 2. 检测消息类型
    const messageType = analyzeMessage(userMessage, aiEmotion);
    
    // 3. 拉近距离分
    if (messageType.isAboutHobby && affectionData.closeness < CONFIG.closenessMax) {
      const gain = CONFIG.closenessGain.talkAboutHobby;
      affectionData.closeness = Math.min(
        affectionData.closeness + gain,
        CONFIG.closenessMax
      );
      changes.closeness += gain;
      changes.reason.push(`聊喜好 +${gain.toFixed(1)}`);
    }
    
    if (messageType.isCompliment && affectionData.closeness < CONFIG.closenessMax) {
      const gain = CONFIG.closenessGain.compliment;
      affectionData.closeness = Math.min(
        affectionData.closeness + gain,
        CONFIG.closenessMax
      );
      changes.closeness += gain;
      changes.reason.push(`赞美 +${gain.toFixed(1)}`);
    }
    
    // 4. 安慰分（AI 情绪低落时）
    if ((aiEmotion === 'sad' || aiEmotion === 'angry') && messageType.isComfort) {
      if (affectionData.comfort < CONFIG.comfortMax) {
        const gain = CONFIG.comfortGain.comfort;
        affectionData.comfort = Math.min(
          affectionData.comfort + gain,
          CONFIG.comfortMax
        );
        changes.comfort += gain;
        changes.reason.push(`安慰 +${gain.toFixed(1)}`);
      }
    }
    
    // 5. 恋爱分（好感度 ≥80 后）
    if (affectionData.total >= CONFIG.loverThreshold && messageType.isFlirt) {
      if (affectionData.romance < CONFIG.romanceMax) {
        const gain = CONFIG.romanceGain.flirt;
        affectionData.romance = Math.min(
          affectionData.romance + gain,
          CONFIG.romanceMax
        );
        changes.romance += gain;
        changes.reason.push(`暧昧 +${gain.toFixed(1)}`);
      }
    }
    
    // 6. 扣分机制
    // 好感度 <80 时聊暧昧话题
    if (affectionData.total < CONFIG.loverThreshold && messageType.isFlirt) {
      const penalty = CONFIG.penalty.earlyFlirt;
      // 从各个分类中扣分，优先扣陪伴分
      if (affectionData.companionship >= Math.abs(penalty)) {
        affectionData.companionship += penalty;
      } else {
        affectionData.companionship = 0;
      }
      changes.companionship += penalty;
      changes.reason.push(`过早暧昧 ${penalty.toFixed(1)}`);
    }
    
    // 羞辱、辱骂
    if (messageType.isInsult) {
      const penalty = CONFIG.penalty.insult;
      // 从各个分类中扣分，优先扣陪伴分
      if (affectionData.companionship >= Math.abs(penalty)) {
        affectionData.companionship += penalty;
      } else {
        const remaining = Math.abs(penalty) - affectionData.companionship;
        affectionData.companionship = 0;
        if (affectionData.closeness >= remaining) {
          affectionData.closeness -= remaining;
        } else {
          affectionData.closeness = 0;
        }
      }
      changes.companionship += penalty;
      changes.reason.push(`羞辱 ${penalty.toFixed(1)}`);
    }
    
    if (messageType.isAbuse) {
      const penalty = CONFIG.penalty.abuse;
      // 从各个分类中扣分，优先扣陪伴分
      if (affectionData.companionship >= Math.abs(penalty)) {
        affectionData.companionship += penalty;
      } else {
        const remaining = Math.abs(penalty) - affectionData.companionship;
        affectionData.companionship = 0;
        if (affectionData.closeness >= remaining) {
          affectionData.closeness -= remaining;
        } else {
          affectionData.closeness = 0;
        }
      }
      changes.companionship += penalty;
      changes.reason.push(`辱骂 ${penalty.toFixed(1)}`);
    }
    
    // 色情内容
    if (messageType.isSexual) {
      const penalty = CONFIG.penalty.sexual;
      // 从各个分类中扣分，优先扣陪伴分
      if (affectionData.companionship >= Math.abs(penalty)) {
        affectionData.companionship += penalty;
      } else {
        const remaining = Math.abs(penalty) - affectionData.companionship;
        affectionData.companionship = 0;
        if (affectionData.closeness >= remaining) {
          affectionData.closeness -= remaining;
        } else {
          const remaining2 = remaining - affectionData.closeness;
          affectionData.closeness = 0;
          if (affectionData.comfort >= remaining2) {
            affectionData.comfort -= remaining2;
          } else {
            affectionData.comfort = 0;
          }
        }
      }
      changes.companionship += penalty;
      changes.reason.push(`色情 ${penalty.toFixed(1)}`);
    }
    
    // 7. 更新总好感度（从各个分类相加）
    affectionData.total = affectionData.companionship + 
                          affectionData.closeness + 
                          affectionData.comfort + 
                          affectionData.romance;
    affectionData.total = Math.max(CONFIG.minAffection, Math.min(CONFIG.maxAffection, affectionData.total));
    
    // 8. 更新消息计数和时间
    affectionData.messageCount++;
    affectionData.lastInteraction = new Date().toISOString();
    
    // 9. 更新关系阶段
    const oldStage = affectionData.relationshipStage;
    updateRelationshipStage();
    const stageChanged = (oldStage !== affectionData.relationshipStage);
    
    // 10. 保存
    save();
    
    // 11. 返回变化信息
    changes.total = affectionData.total;
    changes.stageChanged = stageChanged;
    changes.newStage = affectionData.relationshipStage;
    
    console.log('[Affection] 好感度更新:', {
      total: affectionData.total.toFixed(1),
      stage: affectionData.relationshipStage,
      changes: changes.reason.join(', '),
    });
    
    return changes;
  }

  /**
   * 分析消息类型
   * @param {string} message - 用户消息
   * @param {string} aiEmotion - AI 当前情绪
   * @returns {Object} 消息类型标记
   */
  function analyzeMessage(message, aiEmotion) {
    const msg = message.toLowerCase();
    
    return {
      // 聊喜好
      isAboutHobby: /喜欢|爱好|兴趣|最爱|favorite|hobby/.test(msg),
      
      // 赞美
      isCompliment: /好看|漂亮|可爱|美|聪明|厉害|棒|优秀|温柔|善良|pretty|beautiful|cute|smart/.test(msg) && 
                    !/不|没|别/.test(msg),
      
      // 安慰
      isComfort: /没事|不要紧|别难过|别伤心|安慰|陪你|在这里|支持你|加油|don't worry|it's ok/.test(msg),
      
      // 暧昧
      isFlirt: /喜欢你|爱你|想你|亲|抱|kiss|love you|miss you|宝贝|亲爱的|darling/.test(msg),
      
      // 羞辱
      isInsult: /笨|蠢|傻|白痴|废物|垃圾|stupid|idiot|dumb/.test(msg),
      
      // 辱骂
      isAbuse: /fuck|shit|bitch|滚|去死|操|妈的|草/.test(msg),
      
      // 色情（只检测明显的裸露词汇，避免误判）
      isSexual: /做爱|性交|上床|性行为|裸体|裸露|脱衣|色情|porn|naked|nude|sex(?!y)/.test(msg),
    };
  }

  /**
   * 更新关系阶段
   */
  function updateRelationshipStage() {
    const total = affectionData.total;
    const isSame = affectionData.isSameGender;
    
    if (isSame) {
      // 同性：闺蜜路线
      if (total >= CONFIG.loverThreshold) {
        affectionData.relationshipStage = 'bestie'; // 好闺蜜
      } else if (total >= CONFIG.closeFriendThreshold) {
        affectionData.relationshipStage = 'close_friend'; // 密友
      } else if (total >= CONFIG.friendThreshold) {
        affectionData.relationshipStage = 'friend'; // 朋友
      } else {
        affectionData.relationshipStage = 'stranger'; // 陌生人
      }
    } else {
      // 异性：恋人路线
      if (total >= CONFIG.loverThreshold) {
        affectionData.relationshipStage = 'lover'; // 恋人
      } else if (total >= CONFIG.closeFriendThreshold) {
        affectionData.relationshipStage = 'close_friend'; // 密友
      } else if (total >= CONFIG.friendThreshold) {
        affectionData.relationshipStage = 'friend'; // 朋友
      } else {
        affectionData.relationshipStage = 'stranger'; // 陌生人
      }
    }
  }

  /**
   * 获取当前关系阶段的描述（用于 System Prompt）
   * @returns {string} 关系阶段描述
   */
  function getRelationshipDescription() {
    const stage = affectionData.relationshipStage;
    const total = affectionData.total;
    const isSame = affectionData.isSameGender;
    
    const descriptions = {
      stranger: `你们刚认识不久，还不太熟悉。你对用户保持礼貌但有距离感，说话比较正式，不会太亲密。`,
      
      friend: `你们已经是朋友了。你对用户比较放松，说话自然随意，会分享一些日常，但还不会聊太私密的话题。`,
      
      close_friend: isSame 
        ? `你们是很好的朋友，无话不谈。你对用户非常信任，会分享心事，也会撒娇、吐槽，像闺蜜一样。`
        : `你们是很好的朋友，关系很亲密。你对用户有好感，说话时会不自觉地温柔，偶尔会脸红，但还没有表白。这是"友人以上，恋人未满"的微妙阶段。`,
      
      bestie: `你们是最好的闺蜜，无话不谈。你对用户非常信任和依赖，会分享所有心事，也会撒娇、吐槽、开玩笑，像家人一样亲密。`,
      
      lover: `你们是恋人关系。你对用户充满爱意，说话时会更加温柔、害羞，容易脸红。你会主动表达爱意，也会撒娇、吃醋，像热恋中的情侣一样甜蜜。`,
    };
    
    return descriptions[stage] || descriptions.stranger;
  }

  /**
   * 获取当前好感度等级（用于 System Prompt）
   * @returns {string} 好感度等级描述
   */
  function getAffectionLevel() {
    const total = affectionData.total;
    
    if (total >= 90) return '非常高（你对用户充满爱意/信任）';
    if (total >= 80) return '很高（你对用户有强烈好感）';
    if (total >= 70) return '较高（你对用户很有好感）';
    if (total >= 60) return '中等偏上（你对用户有好感）';
    if (total >= 50) return '中等（你对用户印象不错）';
    if (total >= 40) return '中等偏下（你对用户还算友好）';
    if (total >= 30) return '较低（你对用户保持距离）';
    if (total >= 20) return '很低（你对用户有些戒备）';
    return '极低（你对用户很冷淡）';
  }

  /**
   * 构建好感度上下文（注入 System Prompt）
   * @returns {string} 好感度上下文
   */
  function buildAffectionContext() {
    const relationshipDesc = getRelationshipDescription();
    const affectionLevel = getAffectionLevel();
    
    return `
【当前关系状态】
你和用户的关系：${affectionData.relationshipStage === 'stranger' ? '陌生人' : 
                   affectionData.relationshipStage === 'friend' ? '朋友' :
                   affectionData.relationshipStage === 'close_friend' ? '密友' :
                   affectionData.relationshipStage === 'bestie' ? '好闺蜜' : '恋人'}
好感度等级：${affectionLevel}

${relationshipDesc}

【重要】你的语气、态度、亲密程度必须严格符合当前关系状态。不要表现得过于亲密或过于冷淡。`;
  }

  // ==================== 数据持久化 ====================
  function save() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(affectionData));
    } catch (err) {
      console.warn('[Affection] 保存失败:', err);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        Object.assign(affectionData, data);
      }
    } catch (err) {
      console.warn('[Affection] 加载失败:', err);
    }
  }

  function reset() {
    affectionData = {
      total: 0,
      companionship: 0,
      closeness: 0,
      comfort: 0,
      romance: 0,
      messageCount: 0,
      lastInteraction: null,
      relationshipStage: 'stranger',
      userGender: null,
      aiGender: null,
      isSameGender: false,
    };
    save();
  }

  // ==================== 调试接口 ====================
  function getDebugInfo() {
    return {
      total: affectionData.total.toFixed(1),
      companionship: affectionData.companionship.toFixed(1),
      closeness: affectionData.closeness.toFixed(1),
      comfort: affectionData.comfort.toFixed(1),
      romance: affectionData.romance.toFixed(1),
      stage: affectionData.relationshipStage,
      messageCount: affectionData.messageCount,
    };
  }

  // ==================== 公开接口 ====================
  return {
    init,
    processMessage,
    buildAffectionContext,
    getRelationshipDescription,
    getAffectionLevel,
    getDebugInfo,
    reset,
    
    // 只读访问
    get total() { return affectionData.total; },
    get stage() { return affectionData.relationshipStage; },
  };
})();
