#!/bin/bash

# AI Companion 一键启动脚本
# 双击此文件即可启动服务器

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌸 AI Companion 启动中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 切换到脚本所在目录（项目根目录）
cd "$(dirname "$0")"

echo "📁 项目目录: $(pwd)"
echo ""

# 1. 检查 Node.js
echo "✓ 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    echo ""
    echo "请先安装 Node.js:"
    echo "https://nodejs.org/"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi
echo "  Node.js $(node -v) ✓"
echo ""

# 2. 检查依赖
echo "✓ 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "  首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        read -p "按 Enter 键退出..."
        exit 1
    fi
fi
echo "  依赖完整 ✓"
echo ""

# 3. 清理端口
echo "✓ 检查端口..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  正在停止旧进程..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 2
fi
echo "  端口 3000 可用 ✓"
echo ""

# 4. 启动服务器
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 启动服务器..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node server.js &
SERVER_PID=$!

# 等待启动
sleep 5

# 验证启动
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 服务器已启动！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 访问: http://localhost:3000"
    echo "📝 进程: $SERVER_PID"
    echo ""
    echo "💡 提示:"
    echo "  - 浏览器即将自动打开"
    echo "  - 关闭此窗口将停止服务器"
    echo "  - 按 Ctrl+C 也可停止"
    echo ""
    
    # 打开浏览器
    sleep 2
    open http://localhost:3000
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 保持运行
    wait $SERVER_PID
else
    echo "❌ 启动失败"
    echo ""
    echo "请手动运行查看错误:"
    echo "  cd $(pwd)"
    echo "  node server.js"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi

echo ""
echo "👋 服务器已停止"
