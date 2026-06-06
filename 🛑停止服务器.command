#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛑 停止 AI Companion 服务器"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 查找端口 3000 的进程
PIDS=$(lsof -ti:3000 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "ℹ️  没有运行中的服务器"
else
    echo "🔍 找到进程: $PIDS"
    echo "正在停止..."
    echo ""
    
    # 停止进程
    echo "$PIDS" | xargs kill -9 2>/dev/null
    sleep 1
    
    # 验证
    if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ 服务器已停止"
    else
        echo "⚠️  可能还有残留进程"
    fi
fi

echo ""
read -p "按 Enter 键退出..."
