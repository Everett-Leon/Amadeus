#!/bin/bash

# AI Companion 停止脚本 (macOS)
# 用于停止正在运行的服务器

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛑 AI Companion 停止脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 查找占用端口 3000 的进程
PORT=3000
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "ℹ️  没有找到运行中的服务器（端口 $PORT）"
else
    echo "🔍 找到进程: $PIDS"
    echo "正在停止..."
    
    # 停止所有相关进程
    echo "$PIDS" | xargs kill -9 2>/dev/null
    
    sleep 1
    
    # 验证是否成功停止
    if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ 服务器已成功停止"
    else
        echo "⚠️  可能还有残留进程，请手动检查"
    fi
fi

echo ""
read -p "按 Enter 键退出..."
