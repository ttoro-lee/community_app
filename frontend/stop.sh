#!/bin/bash

# Community Frontend - React/Vite 종료 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/storage/.frontend.pid"

echo "🛑 커뮤니티 프론트엔드 서버 종료 중..."

# 1) PID 파일로 프로세스 트리 종료 (npm → vite 자식 포함)
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "🔍 npm 프로세스(PID: $PID) 및 자식 프로세스 종료 중..."
    if command -v taskkill &>/dev/null; then
      taskkill /F /T /PID "$PID" &>/dev/null || true
    else
      kill -- -"$PID" 2>/dev/null || kill "$PID"
    fi
  fi
  rm -f "$PID_FILE"
fi

# 2) pgrep으로 남아있는 vite 프로세스 추가 정리
PIDS=$(pgrep -f "vite" 2>/dev/null)
if [ -n "$PIDS" ]; then
    echo "🔍 잔여 vite 프로세스 발견: $PIDS"
    kill $PIDS 2>/dev/null
    sleep 2
    pkill -9 -f "vite" 2>/dev/null || true
fi

# 3) 포트 5173 점유 프로세스 최종 정리 (tr -d '\r': CRLF 제거 필수)
pid=$(netstat -ano 2>/dev/null | tr -d '\r' | grep "LISTENING" | grep ":5173[[:space:]]" | awk '{print $NF}' | head -1)
if [ -n "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null; then
  echo "   🔌 포트 5173 점유 프로세스(PID: $pid) 종료 중..."
  if MSYS_NO_PATHCONV=1 taskkill /F /T /PID "$pid" 2>/dev/null; then
    echo "   ✅ PID $pid 종료 완료"
  else
    kill -9 "$pid" 2>/dev/null && echo "   ✅ PID $pid 강제 종료 완료" || echo "   ⚠️  PID $pid 종료 실패"
  fi
fi

echo "✅ 프론트엔드 서버가 종료되었습니다."
