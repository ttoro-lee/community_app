#!/bin/bash

# Community App - 백엔드 + 프론트엔드 종료 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo " 커뮤니티 앱 종료"
echo "========================================"
echo ""

stop_service() {
  local name="$1"
  local pid_file="$2"

  if [ -f "$pid_file" ]; then
    PID=$(cat "$pid_file")
    if kill -0 "$PID" 2>/dev/null; then
      echo "🛑 $name 종료 중... (PID: $PID)"
      kill "$PID"
      # 최대 5초 대기
      for i in $(seq 1 5); do
        sleep 1
        if ! kill -0 "$PID" 2>/dev/null; then
          break
        fi
      done
      # 아직 살아있으면 강제 종료
      if kill -0 "$PID" 2>/dev/null; then
        echo "   ⚡ 강제 종료합니다..."
        kill -9 "$PID"
      fi
      echo "   ✅ $name 종료 완료"
    else
      echo "ℹ️  $name 프로세스를 찾을 수 없습니다. (PID: $PID)"
    fi
    rm -f "$pid_file"
  else
    echo "ℹ️  $name 이 실행 중이지 않습니다."
  fi
}

stop_service "백엔드" "$SCRIPT_DIR/backend/storage/.backend.pid"
echo ""
stop_service "프론트엔드" "$SCRIPT_DIR/frontend/storage/.frontend.pid"

echo ""
echo "✅ 모든 서비스가 종료되었습니다."
echo "========================================"
