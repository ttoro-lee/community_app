#!/bin/bash

# Community App - 백엔드 + 프론트엔드 종료 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID_FILE="$SCRIPT_DIR/backend/storage/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/frontend/storage/.frontend.pid"

echo "========================================"
echo " 커뮤니티 앱 종료"
echo "========================================"
echo ""

# ── 헬퍼: 포트 점유 PID 반환 (tr -d '\r': Windows CRLF 제거) ─────────────────
get_port_pid() {
  netstat -ano 2>/dev/null | tr -d '\r' | grep "LISTENING" | grep ":$1[[:space:]]" | awk '{print $NF}' | head -1
}

# ── 헬퍼: PID 파일 기반 프로세스 트리 종료 ───────────────────────────────────
stop_by_pid_file() {
  local name="$1"
  local pid_file="$2"

  if [ ! -f "$pid_file" ]; then
    echo "ℹ️  $name PID 파일 없음 → 건너뜁니다."
    return
  fi

  local pid
  pid=$(cat "$pid_file" | tr -d '\r')
  rm -f "$pid_file"

  if ! kill -0 "$pid" 2>/dev/null; then
    echo "ℹ️  $name 프로세스(PID: $pid)가 이미 종료됨"
    return
  fi

  echo "🛑 $name 종료 중... (PID: $pid)"
  # 프로세스 트리 전체 종료 (npm → vite, uvicorn → worker 등 자식 포함)
  if MSYS_NO_PATHCONV=1 taskkill /F /T /PID "$pid" 2>/dev/null; then
    echo "   ✅ $name 종료 완료"
  else
    kill -9 "$pid" 2>/dev/null && echo "   ✅ $name 강제 종료 완료" || echo "   ⚠️  $name 종료 실패"
  fi
}

# ── 헬퍼: 포트 점유 프로세스 종료 ────────────────────────────────────────────
kill_port() {
  local port="$1"
  local pid
  pid=$(get_port_pid "$port")
  if [ -n "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null; then
    echo "   🔌 포트 ${port} 점유 프로세스(PID: $pid) 종료 중..."
    if MSYS_NO_PATHCONV=1 taskkill /F /T /PID "$pid" 2>/dev/null; then
      echo "   ✅ PID $pid 종료 완료"
    else
      kill -9 "$pid" 2>/dev/null && echo "   ✅ PID $pid 강제 종료 완료" || echo "   ⚠️  PID $pid 종료 실패 (이미 종료됐을 수 있음)"
    fi
  else
    echo "   ✅ 포트 ${port} 사용 중인 프로세스 없음"
  fi
}

# ── 종료 실행 ─────────────────────────────────────────────────────────────────
stop_by_pid_file "백엔드" "$BACKEND_PID_FILE"
echo ""
stop_by_pid_file "프론트엔드" "$FRONTEND_PID_FILE"
echo ""

# PID 파일이 없거나 이미 죽어있어도 포트에 남아있는 좀비 프로세스 정리
echo "🔍 잔여 포트 점유 프로세스 확인..."
kill_port 8000
kill_port 5173

echo ""
echo "✅ 모든 서비스가 종료되었습니다."
echo "========================================"
