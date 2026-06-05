#!/bin/bash

# AI Companion 一键启动脚本 (macOS)
# 双击此文件即可启动服务器并打开浏览器

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 打印启动信息
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌸 AI Companion 启动脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    echo "请先安装 Node.js: https://nodejs.org/"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    echo ""
fi

# 检查端口是否被占用
PORT=3000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  警告: 端口 $PORT 已被占用"
    echo "正在尝试停止旧进程..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 2
fi

# 启动服务器
echo "🚀 正在启动服务器..."
node server.js &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器就绪..."
sleep 3

# 检查服务器是否成功启动
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ AI Companion 已成功启动！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 访问地址: http://localhost:$PORT"
    echo "📝 进程 PID: $SERVER_PID"
    echo "⚠️  按 Ctrl+C 或关闭此窗口将停止服务器"
    echo ""
    
    # 自动打开浏览器
    open http://localhost:$PORT
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "服务器运行中... (日志输出如下)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 等待进程结束
    wait $SERVER_PID
else
    echo ""
    echo "❌ 服务器启动失败"
    echo "请检查错误信息并重试"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi

echo ""
echo "👋 服务器已停止"
