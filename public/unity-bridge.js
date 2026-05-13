// =============================================
// AI Companion — Unity ↔ Web 桥接层
// =============================================
// 在 Unity WebGL 环境中，提供 JS → Unity 的表情/动作指令通道
// 在普通浏览器环境中静默降级，不影响 2D 原型运行
// =============================================

const UnityBridge = (() => {
  'use strict';

  // ==================== 状态 ====================

  /** @type {boolean} 是否检测到 Unity 实例 */
  let _unityReady = false;

  /** @type {object|null} Unity 实例引用（Unity WebGL 模板注入） */
  let _unityInstance = null;

  /** @type {number} 心跳定时器 ID */
  let _heartbeatTimer = null;

  /** @type {number} 心跳间隔（毫秒） */
  const HEARTBEAT_INTERVAL = 30000;

  /** @type {boolean} 是否已发送最后一次心跳 */
  let _lastHeartbeatOk = false;

  /** @type {object} 回调注册表 */
  const _callbacks = {
    onReady: [],
    onDisconnected: [],
    onActionComplete: [],
    onEmotionComplete: [],
    onUnityMessage: [],
  };

  // ==================== Unity 检测 ====================

  /**
   * 检测 Unity WebGL 实例是否可用
   * Unity WebGL 模板会在 window 上挂载 createUnityInstance 或直接暴露 unityInstance
   * @returns {boolean}
   */
  function _detectUnity() {
    // Unity 2020+ WebGL 模板的标准全局引用
    if (window.unityInstance) {
      _unityInstance = window.unityInstance;
      return true;
    }
    // 部分旧版模板或自定义模板
    if (window.gameInstance) {
      _unityInstance = window.gameInstance;
      return true;
    }
    // UnityLoader 模式
    if (typeof window.createUnityInstance === 'function') {
      // 实例尚未创建完成，但可以监听
      return false;
    }
    return false;
  }

  // ==================== 初始化 ====================

  /**
   * 初始化 UnityBridge
   * 应在页面加载完成后调用
   * 如果检测到 Unity 环境，自动建立心跳连接
   */
  function init() {
    // 先检测一次
    if (_detectUnity()) {
      _onUnityConnected();
      return;
    }

    // 如果当前没有 Unity 实例，设置轮询检测
    // Unity WebGL 加载需要时间，最多等待 60 秒
    let checkCount = 0;
    const maxChecks = 60; // 60 秒（每秒检测一次）

    const checkInterval = setInterval(() => {
      checkCount++;
      if (_detectUnity()) {
        clearInterval(checkInterval);
        _onUnityConnected();
      } else if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
        console.log('[UnityBridge] 未检测到 Unity 实例，以独立 Web 模式运行');
      }
    }, 1000);
  }

  /**
   * Unity 实例连接成功后的初始化
   * @private
   */
  function _onUnityConnected() {
    _unityReady = true;
    _lastHeartbeatOk = true;
    console.log('[UnityBridge] Unity 实例已连接');

    // 启动心跳
    _startHeartbeat();

    // 通知所有 onReady 回调
    _callbacks.onReady.forEach(cb => {
      try { cb(); } catch (err) { console.error('[UnityBridge] onReady callback error:', err); }
    });
  }

  // ==================== 心跳检测 ====================

  /**
   * 启动心跳定时器
   * @private
   */
  function _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatTimer = setInterval(() => {
      _pingUnity();
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * 停止心跳定时器
   * @private
   */
  function _stopHeartbeat() {
    if (_heartbeatTimer) {
      clearInterval(_heartbeatTimer);
      _heartbeatTimer = null;
    }
  }

  /**
   * 向 Unity 发送心跳 ping
   * @private
   */
  function _pingUnity() {
    if (!_unityReady || !_unityInstance) return;

    try {
      _sendMessage('BridgeReceiver', 'OnHeartbeat', '');
      _lastHeartbeatOk = true;
    } catch (err) {
      if (_lastHeartbeatOk) {
        _lastHeartbeatOk = false;
        console.warn('[UnityBridge] 心跳失败，Unity 可能已断开');
      }
      // 如果连续失败多次，标记为断开
      // （不立即断开，给 Unity 恢复的机会）
    }
  }

  // ==================== 核心通信 ====================

  /**
   * 向 Unity 发送消息（底层方法）
   * @param {string} gameObject - Unity 场景中 GameObject 的名称
   * @param {string} method - GameObject 上 MonoBehaviour 的方法名
   * @param {string} value - 传递的参数（字符串）
   * @private
   */
  function _sendMessage(gameObject, method, value) {
    if (!_unityReady || !_unityInstance) {
      console.warn(`[UnityBridge] Unity 未就绪，跳过消息: ${gameObject}.${method}(${value})`);
      return false;
    }

    try {
      _unityInstance.SendMessage(gameObject, method, value);
      return true;
    } catch (err) {
      console.error(`[UnityBridge] 发送消息失败: ${gameObject}.${method} —`, err.message);
      return false;
    }
  }

  // ==================== 表情控制 ====================

  /**
   * 设置角色表情
   * 调用 Unity 场景中 EmotionController 组件的 SetEmotion 方法
   * @param {string} emotionId - 情绪 ID（如 'happy', 'shy', 'angry', 'idle' 等）
   * @param {number} [intensity=1.0] - 表情强度（0.0 ~ 1.0），控制 BlendShape 权重
   * @returns {boolean} 是否成功发送
   *
   * @example
   * // 设置开心表情，全强度
   * UnityBridge.setExpression('happy', 1.0);
   *
   * // 设置害羞表情，中等强度
   * UnityBridge.setExpression('shy', 0.6);
   *
   * // 回归平静
   * UnityBridge.setExpression('idle');
   */
  function setExpression(emotionId, intensity = 1.0) {
    if (!emotionId || typeof emotionId !== 'string') {
      console.warn('[UnityBridge] setExpression: emotionId 无效');
      return false;
    }

    // 参数校验
    const clampedIntensity = Math.max(0, Math.min(1, Number(intensity) || 1.0));
    const payload = JSON.stringify({ emotionId, intensity: clampedIntensity });

    return _sendMessage('EmotionController', 'SetEmotion', payload);
  }

  /**
   * 设置多个表情叠加（用于微表情组合）
   * @param {Array<{id: string, weight: number}>} blendShapes - 表情混合列表
   * @returns {boolean} 是否成功发送
   *
   * @example
   * // 害羞 = 脸红 + 眨眼 + 视线偏移
   * UnityBridge.setBlendExpression([
   *   { id: 'blush', weight: 0.8 },
   *   { id: 'eye_smile', weight: 0.5 },
   *   { id: 'look_away', weight: 0.6 },
   * ]);
   */
  function setBlendExpression(blendShapes) {
    if (!Array.isArray(blendShapes) || blendShapes.length === 0) {
      console.warn('[UnityBridge] setBlendExpression: 参数必须是非空数组');
      return false;
    }

    const payload = JSON.stringify(blendShapes);
    return _sendMessage('EmotionController', 'SetBlendExpression', payload);
  }

  // ==================== 动作控制 ====================

  /**
   * 触发角色动作
   * 调用 Unity 场景中 ActionController 组件的 TriggerAction 方法
   * @param {string} actionId - 动作 ID（如 'wave', 'bow', 'nod', 'headpat', 'sing', 'dance' 等）
   * @param {Object} [params={}] - 动作参数
   * @param {number} [params.duration=0] - 动作持续时间（秒），0 表示使用默认/循环
   * @param {boolean} [params.loop=false] - 是否循环播放
   * @param {string} [params.emotion] - 动作关联的情绪（可选，触发动作时同时切换表情）
   * @returns {boolean} 是否成功发送
   *
   * @example
   * // 挥手
   * UnityBridge.triggerAction('wave');
   *
   * // 唱歌（5秒，带开心表情）
   * UnityBridge.triggerAction('sing', { duration: 5, emotion: 'happy' });
   *
   * // 跳舞（循环）
   * UnityBridge.triggerAction('dance', { loop: true });
   */
  function triggerAction(actionId, params = {}) {
    if (!actionId || typeof actionId !== 'string') {
      console.warn('[UnityBridge] triggerAction: actionId 无效');
      return false;
    }

    const payload = JSON.stringify({
      actionId,
      duration: Number(params.duration) || 0,
      loop: !!params.loop,
      emotion: params.emotion || null,
    });

    return _sendMessage('ActionController', 'TriggerAction', payload);
  }

  /**
   * 取消当前正在播放的动作，回归 Idle 状态
   * @returns {boolean}
   */
  function cancelAction() {
    return _sendMessage('ActionController', 'CancelAction', '');
  }

  // ==================== 口型同步 ====================

  /**
   * 设置口型 BlendShape（用于 TTS 语音播放时同步）
   * @param {string} viseme - 音素 ID（如 'aa', 'ih', 'ou', 'ee', 'oh', 'silence'）
   * @param {number} [weight=1.0] - 权重
   * @returns {boolean}
   *
   * @example
   * // TTS 开始播放时
   * UnityBridge.setViseme('aa', 0.8);
   *
   * // TTS 结束时
   * UnityBridge.setViseme('silence', 0);
   */
  function setViseme(viseme, weight = 1.0) {
    if (!viseme) return false;
    const payload = JSON.stringify({ viseme, weight: Math.max(0, Math.min(1, weight)) });
    return _sendMessage('LipSyncController', 'SetViseme', payload);
  }

  // ==================== 场景控制 ====================

  /**
   * 切换背景场景
   * @param {string} sceneId - 场景 ID（如 'bedroom', 'library', 'park', 'night', 'sakura'）
   * @returns {boolean}
   */
  function setScene(sceneId) {
    if (!sceneId) return false;
    return _sendMessage('SceneController', 'SetScene', sceneId);
  }

  /**
   * 触发入场动画
   * @param {string} [entranceId] - 入场动画 ID，不传则随机选择
   * @returns {boolean}
   */
  function playEntrance(entranceId) {
    return _sendMessage('ActionController', 'PlayEntrance', entranceId || 'random');
  }

  // ==================== 回调接口（供 Unity 调用） ====================

  /**
   * Unity 主动调用的回调：动作完成
   * Unity 端在动作播放完毕后通过 SendMessage 调用此方法
   * @param {string} actionId - 完成的动作 ID
   */
  function onActionComplete(actionId) {
    _callbacks.onActionComplete.forEach(cb => {
      try { cb(actionId); } catch (err) { console.error('[UnityBridge] onActionComplete callback error:', err); }
    });
  }

  /**
   * Unity 主动调用的回调：表情切换完成
   * @param {string} emotionId - 已切换到的表情 ID
   */
  function onEmotionComplete(emotionId) {
    _callbacks.onEmotionComplete.forEach(cb => {
      try { cb(emotionId); } catch (err) { console.error('[UnityBridge] onEmotionComplete callback error:', err); }
    });
  }

  /**
   * Unity 主动调用的回调：接收到 Unity 发来的自定义消息
   * @param {string} messageJson - JSON 格式的消息内容
   */
  function onUnityMessage(messageJson) {
    let parsed;
    try { parsed = JSON.parse(messageJson); } catch { parsed = { raw: messageJson }; }
    _callbacks.onUnityMessage.forEach(cb => {
      try { cb(parsed); } catch (err) { console.error('[UnityBridge] onUnityMessage callback error:', err); }
    });
  }

  /**
   * 注册事件回调
   * @param {string} event - 事件名称：'ready' | 'disconnected' | 'actionComplete' | 'emotionComplete' | 'unityMessage'
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消注册的函数
   *
   * @example
   * const unregister = UnityBridge.on('actionComplete', (actionId) => {
   *   console.log('动作完成:', actionId);
   * });
   * // 取消注册
   * unregister();
   */
  function on(event, callback) {
    const eventMap = {
      ready: _callbacks.onReady,
      disconnected: _callbacks.onDisconnected,
      actionComplete: _callbacks.onActionComplete,
      emotionComplete: _callbacks.onEmotionComplete,
      unityMessage: _callbacks.onUnityMessage,
    };
    const list = eventMap[event];
    if (!list || typeof callback !== 'function') {
      console.warn(`[UnityBridge] on: 无效的事件 "${event}" 或回调`);
      return () => {};
    }
    list.push(callback);
    // 返回取消注册函数
    return () => {
      const index = list.indexOf(callback);
      if (index > -1) list.splice(index, 1);
    };
  }

  // ==================== 状态查询 ====================

  /**
   * 检查 Unity 是否已就绪
   * @returns {boolean}
   */
  function isReady() {
    return _unityReady;
  }

  /**
   * 获取连接状态信息
   * @returns {{ready: boolean, heartbeatOk: boolean}}
   */
  function getStatus() {
    return {
      ready: _unityReady,
      heartbeatOk: _lastHeartbeatOk,
    };
  }

  /**
   * 销毁桥接，清理资源
   */
  function destroy() {
    _stopHeartbeat();
    _unityReady = false;
    _unityInstance = null;
    _lastHeartbeatOk = false;
    // 清空所有回调
    Object.keys(_callbacks).forEach(key => { _callbacks[key] = []; });
  }

  // ==================== 公开接口 ====================
  return {
    init,
    isReady,
    getStatus,
    destroy,

    // 表情
    setExpression,
    setBlendExpression,

    // 动作
    triggerAction,
    cancelAction,
    playEntrance,

    // 口型
    setViseme,

    // 场景
    setScene,

    // 回调（供 Unity 调用）
    onActionComplete,
    onEmotionComplete,
    onUnityMessage,

    // 事件注册
    on,
  };
})();

// 自动初始化（DOM 就绪后）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UnityBridge.init());
} else {
  UnityBridge.init();
}
