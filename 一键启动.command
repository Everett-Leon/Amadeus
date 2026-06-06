#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌸 AI Companion 正在启动..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 切换到项目目录（使用绝对路径）
cd /Users/luofanchen/Desktop/Amadeus/ai-companion

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    echo "请访问 https://nodejs.org/ 安装"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi

# 清理旧进程
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  正在停止旧进程..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 2
fi

# 启动服务器
echo "🚀 启动服务器..."
echo ""

node server.js &
SERVER_PID=$!

# 等待启动
sleep 5

# 检查是否成功
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 服务器已启动！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 访问地址: http://localhost:3000"
    echo ""
    echo "💡 提示:"
    echo "   - 浏览器即将自动打开"
    echo "   - 关闭此窗口将停止服务器"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 打开浏览器
    sleep 2
    open http://localhost:3000
    
    # 等待
    wait $SERVER_PID
else
    echo "❌ 启动失败"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi

echo ""
echo "👋 服务器已停止"
