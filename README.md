# 커뮤니티 웹 애플리케이션

FastAPI + PostgreSQL + React(Vite)로 구축된 풀스택 커뮤니티 플랫폼입니다.

## 기술 스택

- **백엔드**: FastAPI, SQLAlchemy, PostgreSQL, JWT
- **프론트엔드**: React 18, Vite, React Query, React Router

## 주요 기능

- 회원가입 / 로그인 (JWT 인증)
- 다중 카테고리 게시판
- 게시글 CRUD (작성/수정/삭제/조회)
- 댓글 및 대댓글
- 좋아요/추천 시스템
- 게시글 검색

## 시작하기

### 사전 요구사항

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### PostgreSQL 데이터베이스 생성

```sql
CREATE DATABASE community_db;
```

### 백엔드 실행

```bash
cd backend
cp .env.example .env   # .env 수정 후
bash run.sh
```

서버: http://localhost:8000
API 문서: http://localhost:8000/api/docs

### 프론트엔드 실행

```bash
cd frontend
bash run.sh
```

앱: http://localhost:5173

## 프로젝트 구조

```
community_app/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI 앱 진입점
│   │   ├── dependencies.py   # 의존성 (JWT 인증 등)
│   │   ├── routers/          # API 라우터
│   │   ├── core/             # 설정, 보안
│   │   ├── models/           # SQLAlchemy 모델
│   │   ├── schemas/          # Pydantic 스키마
│   │   ├── services/         # 비즈니스 로직
│   │   └── db/               # DB 연결
│   ├── tests/
│   ├── requirements.txt
│   └── run.sh
└── frontend/
    ├── src/
    │   ├── api/              # API 클라이언트
    │   ├── components/       # 재사용 컴포넌트
    │   ├── contexts/         # React Context
    │   ├── pages/            # 페이지 컴포넌트
    │   └── App.jsx
    ├── package.json
    └── run.sh
```

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/users/register | 회원가입 |
| POST | /api/users/login | 로그인 |
| GET | /api/categories | 카테고리 목록 |
| GET | /api/posts | 게시글 목록 (페이지네이션, 검색) |
| POST | /api/posts | 게시글 작성 |
| GET | /api/posts/{id} | 게시글 상세 |
| PUT | /api/posts/{id} | 게시글 수정 |
| DELETE | /api/posts/{id} | 게시글 삭제 |
| GET | /api/comments?post_id={id} | 댓글 목록 |
| POST | /api/comments | 댓글/대댓글 작성 |
| POST | /api/likes/posts/{id} | 게시글 좋아요 토글 |
| POST | /api/likes/comments/{id} | 댓글 좋아요 토글 |
