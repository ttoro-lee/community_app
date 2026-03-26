#!/bin/bash

# Community App - 백엔드 + 프론트엔드 background 실행 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_PID_FILE="$BACKEND_DIR/storage/.backend.pid"
FRONTEND_PID_FILE="$FRONTEND_DIR/storage/.frontend.pid"
BACKEND_LOG="$BACKEND_DIR/storage/server.log"
FRONTEND_LOG="$FRONTEND_DIR/storage/server.log"

export LANG=C.UTF-8
export LC_ALL=C.UTF-8
export PYTHONIOENCODING=utf-8

echo "========================================"
echo " 커뮤니티 앱 시작"
echo "========================================"
echo ""

mkdir -p "$BACKEND_DIR/storage" "$FRONTEND_DIR/storage"

# ── 헬퍼: 포트 점유 PID 반환 (CRLF 제거) ─────────────────────────────────────
get_port_pid() {
  netstat -ano 2>/dev/null | tr -d '\r' | grep "LISTENING" | grep ":$1[[:space:]]" | awk '{print $NF}' | head -1
}

# ── 헬퍼: 포트 점유 프로세스 종료 ────────────────────────────────────────────
kill_port() {
  local port="$1"
  local pid
  pid=$(get_port_pid "$port")
  if [ -n "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null; then
    echo "   🔌 포트 ${port} 점유 프로세스(PID: $pid) 종료 중..."
    MSYS_NO_PATHCONV=1 taskkill /F /T /PID "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    sleep 1
  fi
}

# ── 헬퍼: PID 파일 기반 프로세스 종료 ────────────────────────────────────────
stop_by_pid_file() {
  local pid_file="$1"
  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file" | tr -d '\r')
    if kill -0 "$pid" 2>/dev/null; then
      MSYS_NO_PATHCONV=1 taskkill /F /T /PID "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

# ── 백엔드 시작 ───────────────────────────────────────────────────────────────
echo "🚀 [1/2] 백엔드 시작 중..."

# 기존 프로세스/포트 정리
stop_by_pid_file "$BACKEND_PID_FILE"
kill_port 8000

cd "$BACKEND_DIR"
uv sync --quiet

nohup uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  >> "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
echo "   ✅ 백엔드 실행됨 (PID: $BACKEND_PID)"
echo "   📄 로그: $BACKEND_LOG"

# 백엔드 준비 대기 (최대 30초) → 프론트 시작 전 ECONNREFUSED 방지
echo "   ⏳ 백엔드 준비 대기 중..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/api/docs > /dev/null 2>&1; then
    echo "   ✅ 백엔드 준비 완료 (${i}초)"
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "   ⚠️  백엔드 준비 확인 시간 초과 (계속 진행)"
  fi
done

echo ""

# ── 프론트엔드 시작 ───────────────────────────────────────────────────────────
echo "🎨 [2/2] 프론트엔드 시작 중..."

# 기존 프로세스/포트 정리
stop_by_pid_file "$FRONTEND_PID_FILE"
kill_port 5173

cd "$FRONTEND_DIR"
npm install --silent

nohup npm run dev \
  >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
echo "   ✅ 프론트엔드 실행됨 (PID: $FRONTEND_PID)"
echo "   📄 로그: $FRONTEND_LOG"

echo ""
echo "========================================"
echo " 서비스 URL"
echo "   🌐 앱:   http://localhost:5173"
echo "   🔧 API:  http://localhost:8000"
echo "   📖 문서: http://localhost:8000/api/docs"
echo ""
echo " 종료하려면: bash stop.sh"
echo "========================================"
