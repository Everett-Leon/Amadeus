#!/bin/bash

# AI Companion 后台启动脚本 (macOS)
# 服务器将在后台运行，关闭终端窗口后仍继续运行

cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌸 AI Companion 后台启动脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    read -p "按 Enter 键退出..."
    exit 1
fi

# 检查端口
PORT=3000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，正在停止旧进程..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 2
fi

# 创建日志目录
mkdir -p logs

# 后台启动服务器
echo "🚀 正在后台启动服务器..."
nohup node server.js > logs/server.log 2>&1 &
SERVER_PID=$!

# 保存 PID
echo $SERVER_PID > logs/server.pid

sleep 3

# 检查是否启动成功
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo ""
    echo "✅ 服务器已在后台启动！"
    echo ""
    echo "🌐 访问地址: http://localhost:$PORT"
    echo "📝 进程 PID: $SERVER_PID"
    echo "📋 日志文件: logs/server.log"
    echo ""
    echo "💡 提示:"
    echo "   - 可以关闭此窗口，服务器将继续运行"
    echo "   - 使用 stop.command 停止服务器"
    echo "   - 查看日志: tail -f logs/server.log"
    echo ""
    
    # 自动打开浏览器
    open http://localhost:$PORT
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "❌ 服务器启动失败，请查看日志: logs/server.log"
fi

echo ""
read -p "按 Enter 键退出..."
