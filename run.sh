#!/bin/bash

# Community App - 백엔드 + 프론트엔드 동시 background 실행 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 한글 인코딩 설정
export LANG=C.UTF-8
export LC_ALL=C.UTF-8
export PYTHONIOENCODING=utf-8

echo "========================================"
echo " 커뮤니티 앱 시작 (background)"
echo "========================================"
echo ""

# ── 백엔드 ──────────────────────────────────
BACKEND_DIR="$SCRIPT_DIR/backend"
BACKEND_PID_FILE="$BACKEND_DIR/storage/.backend.pid"
BACKEND_LOG="$BACKEND_DIR/storage/server.log"
mkdir -p "$BACKEND_DIR/storage"

if [ -f "$BACKEND_PID_FILE" ]; then
  OLD_PID=$(cat "$BACKEND_PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "⚠️  백엔드가 이미 실행 중입니다. (PID: $OLD_PID) → 건너뜁니다."
  else
    rm -f "$BACKEND_PID_FILE"
  fi
fi

if [ ! -f "$BACKEND_PID_FILE" ]; then
  echo "🚀 [1/2] 백엔드 시작 중..."
  cd "$BACKEND_DIR"
  uv sync --quiet
  nohup uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
    > "$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!
  echo $BACKEND_PID > "$BACKEND_PID_FILE"
  echo "   ✅ 백엔드 실행됨 (PID: $BACKEND_PID)"
  echo "   📄 로그: $BACKEND_LOG"
fi

echo ""

# ── 프론트엔드 ──────────────────────────────
FRONTEND_DIR="$SCRIPT_DIR/frontend"
FRONTEND_PID_FILE="$FRONTEND_DIR/storage/.frontend.pid"
FRONTEND_LOG="$FRONTEND_DIR/storage/server.log"
mkdir -p "$FRONTEND_DIR/storage"

if [ -f "$FRONTEND_PID_FILE" ]; then
  OLD_PID=$(cat "$FRONTEND_PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "⚠️  프론트엔드가 이미 실행 중입니다. (PID: $OLD_PID) → 건너뜁니다."
  else
    rm -f "$FRONTEND_PID_FILE"
  fi
fi

if [ ! -f "$FRONTEND_PID_FILE" ]; then
  echo "🎨 [2/2] 프론트엔드 시작 중..."
  cd "$FRONTEND_DIR"
  npm install --silent
  nohup npm run dev \
    > "$FRONTEND_LOG" 2>&1 &
  FRONTEND_PID=$!
  echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
  echo "   ✅ 프론트엔드 실행됨 (PID: $FRONTEND_PID)"
  echo "   📄 로그: $FRONTEND_LOG"
fi

echo ""
echo "========================================"
echo " 서비스 URL"
echo "   🌐 앱:     http://localhost:5173"
echo "   🔧 API:    http://localhost:8000"
echo "   📖 문서:   http://localhost:8000/api/docs"
echo ""
echo " 종료하려면: bash stop.sh"
echo "========================================"
