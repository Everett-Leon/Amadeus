#!/bin/bash
cd "$(dirname "$0")"

echo "🔨 开始打包..."
npm run build:mac

if [ $? -eq 0 ]; then
    echo "📦 打包成功，更新桌面应用..."
    rm -rf ~/Desktop/"AI Companion.app"
    cp -R "dist/mac-arm64/AI Companion.app" ~/Desktop/
    echo "✅ 更新完成！桌面上的 AI Companion.app 已是最新版本"
else
    echo "❌ 打包失败"
    exit 1
fi
