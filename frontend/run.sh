#!/bin/bash

# Community Frontend - React/Vite 실행 스크립트

set -e

echo "🎨 커뮤니티 프론트엔드 시작..."

echo "📥 패키지 설치 중..."
npm install

echo "✅ 개발 서버 시작: http://localhost:5173"
echo ""

npm run dev
