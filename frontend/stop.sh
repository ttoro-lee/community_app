#!/bin/bash

# Community Frontend - React/Vite 종료 스크립트

echo "🛑 커뮤니티 프론트엔드 서버 종료 중..."

# vite 개발 서버 프로세스 찾아서 종료
PIDS=$(pgrep -f "vite" 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "⚠️  실행 중인 서버 프로세스를 찾을 수 없습니다."
    exit 0
fi

echo "🔍 프로세스 발견: $PIDS"
kill $PIDS

# 종료 대기 (최대 5초)
for i in $(seq 1 5); do
    if ! pgrep -f "vite" > /dev/null 2>&1; then
        echo "✅ 서버가 정상적으로 종료되었습니다."
        exit 0
    fi
    sleep 1
done

# 강제 종료
echo "⚡ 강제 종료 중..."
pkill -9 -f "vite" 2>/dev/null
echo "✅ 서버가 강제 종료되었습니다."
