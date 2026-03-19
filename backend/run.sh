#!/bin/bash

# Community Backend - FastAPI 실행 스크립트

set -e

echo "🚀 커뮤니티 백엔드 서버 시작..."

echo "📥 의존성 설치 중..."
uv sync

echo "✅ 서버 시작: http://localhost:8000"
echo "📖 API 문서: http://localhost:8000/api/docs"
echo ""

uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --reload
