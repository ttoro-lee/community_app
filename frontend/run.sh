#!/bin/bash

# Community Frontend - React/Vite 실행 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.frontend.pid"
LOG_DIR="$SCRIPT_DIR/storage"
LOG_FILE="$LOG_DIR/server.log"
mkdir -p "$LOG_DIR"

# 한글 인코딩 설정
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# 이미 실행 중인지 확인
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "⚠️  프론트엔드 서버가 이미 실행 중입니다. (PID: $OLD_PID)"
    echo "   중지하려면: kill $OLD_PID  또는 stop.sh 실행"
    exit 1
  else
    rm -f "$PID_FILE"
  fi
fi

echo "🎨 커뮤니티 프론트엔드 시작 (background)..."

echo "📥 패키지 설치 중..."
cd "$SCRIPT_DIR"
npm install

echo "📄 로그 파일: $LOG_FILE"
echo "✅ 개발 서버 시작: http://localhost:5173"
echo ""

# background로 실행 (nohup + 로그 저장)
nohup npm run dev \
  > "$LOG_FILE" 2>&1 &

FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_FILE"

echo "✅ 프론트엔드 서버가 background에서 실행 중입니다. (PID: $FRONTEND_PID)"
echo "   로그 확인: tail -f $LOG_FILE"
