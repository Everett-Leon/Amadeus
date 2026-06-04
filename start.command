#!/bin/bash
cd "$(dirname "$0")"
echo "🌸 启动 AI Companion..."
node server.js &
SERVER_PID=$!
sleep 3
open http://localhost:3000
echo "✅ AI Companion 已启动"
echo "📝 服务器进程 PID: $SERVER_PID"
echo "⚠️  关闭此窗口将停止服务器"
wait $SERVER_PID
