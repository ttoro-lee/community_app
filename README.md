# 커뮤니티 웹 애플리케이션

FastAPI + PostgreSQL + React(Vite)로 구축된 풀스택 커뮤니티 플랫폼입니다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **백엔드** | FastAPI, SQLAlchemy (ORM), PostgreSQL, JWT (Bearer) |
| **프론트엔드** | React 18, Vite, React Query, React Router v6 |
| **기타** | Pydantic v2, pydantic-settings, python-jose, bcrypt, uv |

---

## 주요 기능

### 회원 시스템
- 회원가입 / 로그인 (JWT Bearer 토큰, 24시간 유효)
- 프로필 수정 (닉네임, 자기소개, 아바타 이미지)
- 비밀번호 변경
- 계정 탈퇴 (비밀번호 확인 후 처리)
- 내가 쓴 글 목록 조회
- 내가 쓴 댓글 목록 조회 (댓글/대댓글 구분)

### 알림
- 내 게시글에 댓글 또는 대댓글이 달리면 알림 생성
- 내 댓글에 대댓글이 달리면 알림 생성 (중복 수신 방지)
- 자기 자신의 글/댓글에는 알림 생성 안 함
- 헤더 벨 아이콘에 미읽음 수 뱃지 표시 (30초 폴링)
- 알림 클릭 시 해당 게시글로 이동 및 읽음 처리
- 단건 읽음 / 전체 읽음 지원

### 게시판
- **다중 카테고리** 지원 (자유게시판 · 질문/답변 · 정보/공유 · 공지사항)
- 게시글 작성 / 수정 / 삭제 / 상세 조회
- 제목 + 본문 통합 검색
- 페이지네이션
- 게시글 핀 고정 (`is_pinned`)
- 이미지 첨부 (jpg · png · gif · webp, 최대 10 MB)

### 공지사항
- 관리자가 일반 게시글을 공지사항으로 등록/해제
- 동시에 최대 10개까지 등록 가능
- 공지 등록 시 원래 카테고리 보존 → 해제 시 자동 복원

### 베스트 게시글
- 공지를 제외한 게시글 중 **좋아요 수 ≥ 설정 임계값**인 글 자동 집계
- 기본 임계값: **10개** (관리자 페이지에서 변경 가능)
- 좋아요 많은 순 → 최신순 정렬

### 댓글 & 대댓글
- 댓글 작성 / 수정 / 삭제
- 대댓글 (1단계 depth)
- 댓글 좋아요

### 좋아요
- 게시글 / 댓글 각각 좋아요 토글 (중복 불가)

### 이모티콘
- 관리자가 이모티콘 등록 / 삭제 / 활성화 토글
- 게시글 작성 시 이모티콘 피커에서 선택 가능
- 이미지 형식: jpg · png · gif · webp, 최대 5 MB

### 관리자 패널 (`/admin`)
- 사이트 통계 (전체 회원 · 게시글 · 댓글 · 관리자 수)
- 회원 목록 조회 및 검색
- 활동 정지 설정 (1일 / 3일 / 7일 / 14일 / 30일 / 1년) 및 해제
- 관리자 권한 부여 / 해제 (슈퍼 관리자 전용)
- 게시글 / 댓글 강제 삭제
- 공지사항 등록 / 해제
- **베스트 게시글 최소 좋아요 수** 설정
- 이모티콘 관리 (등록 · 삭제 · 활성화 토글)

### 권한 체계

| 등급 | 설명 |
|------|------|
| 일반 유저 | 게시글 · 댓글 CRUD, 좋아요 |
| 관리자 (`is_admin`) | + 공지 등록/해제, 게시글/댓글 강제 삭제, 회원 정지, 베스트 설정 변경, 이모티콘 관리 |
| 슈퍼 관리자 (`is_super_admin`) | + 관리자 권한 부여/해제 |

---

## 시작하기

### 사전 요구사항

- Python 3.10+ (`uv` 패키지 매니저)
- Node.js 18+
- PostgreSQL 14+

### 1. 데이터베이스 생성

```sql
CREATE DATABASE community_db;
```

### 2. 전체 실행 (백엔드 + 프론트엔드 동시 background)

```bash
cd community_app
bash run.sh
```

서비스가 background에서 실행되며 로그가 각 `storage/server.log`에 저장됩니다.

### 3. 서비스 종료

```bash
bash stop.sh
```

### 4. 개별 실행

**백엔드만:**
```bash
cd backend
cp .env.example .env   # .env 파일 편집
bash run.sh
```
서버: `http://localhost:8000` · API 문서: `http://localhost:8000/api/docs`

**프론트엔드만:**
```bash
cd frontend
bash run.sh
```
앱: `http://localhost:5173`

### 5. 로그 확인

```bash
tail -f backend/storage/server.log    # 백엔드 (uvicorn + 앱 로그 통합)
tail -f frontend/storage/server.log   # 프론트엔드 (Vite)
```

---

## 환경 변수 (`.env`)

```env
# 앱
APP_NAME=Community API
APP_VERSION=1.0.0
DEBUG=True

# 데이터베이스
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/community_db

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
FRONTEND_URL=http://localhost:5173

# 슈퍼 관리자 자동 생성 (4개 모두 설정 시 서버 시작 시 자동 생성)
SUPER_ADMIN_USERNAME=super
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=변경하세요
SUPER_ADMIN_NICKNAME=관리자
```

> `SECRET_KEY`는 반드시 충분히 길고 랜덤한 값으로 변경하세요.

---

## 프로젝트 구조

```
community_app/
├── run.sh                        # 전체 background 실행
├── stop.sh                       # 전체 종료
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI 앱 진입점 · 자동 마이그레이션
│   │   ├── dependencies.py       # JWT 인증 의존성
│   │   ├── routers/
│   │   │   ├── users.py          # 회원 API
│   │   │   ├── posts.py          # 게시글 API
│   │   │   ├── comments.py       # 댓글 API
│   │   │   ├── likes.py          # 좋아요 API
│   │   │   ├── categories.py     # 카테고리 API
│   │   │   ├── admin.py          # 관리자 API
│   │   │   ├── upload.py         # 이미지 업로드 API
│   │   │   ├── emoticons.py      # 이모티콘 API
│   │   │   └── notifications.py  # 알림 API
│   │   ├── core/
│   │   │   ├── config.py         # 환경 변수 설정
│   │   │   ├── security.py       # 비밀번호 해싱 · JWT
│   │   │   └── logging.py        # 로깅 설정
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── category.py
│   │   │   ├── post.py
│   │   │   ├── comment.py
│   │   │   ├── like.py
│   │   │   ├── emoticon.py
│   │   │   ├── notification.py   # 알림 모델
│   │   │   └── settings.py       # 사이트 설정 (key-value)
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── post.py
│   │   │   ├── comment.py        # MyCommentItem, PaginatedMyComments 포함
│   │   │   ├── category.py
│   │   │   ├── admin.py
│   │   │   ├── emoticon.py
│   │   │   └── notification.py
│   │   ├── services/
│   │   │   ├── user_service.py   # get_my_comments 포함
│   │   │   ├── post_service.py
│   │   │   ├── comment_service.py
│   │   │   ├── like_service.py
│   │   │   ├── category_service.py
│   │   │   ├── admin_service.py
│   │   │   ├── emoticon_service.py
│   │   │   └── notification_service.py
│   │   └── db/
│   │       └── database.py       # DB 연결 · 세션
│   ├── storage/
│   │   ├── server.log            # 서버 로그 (uvicorn + 앱 통합)
│   │   └── uploads/              # 업로드 이미지 저장소
│   │       └── emoticons/        # 이모티콘 이미지
│   └── run.sh
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.js
    │   │   ├── posts.js
    │   │   ├── auth.js            # getMyComments 포함
    │   │   ├── admin.js
    │   │   ├── emoticons.js
    │   │   └── notifications.js   # 알림 API
    │   ├── components/
    │   │   ├── board/             # PostCard, NoticeBar
    │   │   ├── comment/           # CommentItem
    │   │   ├── emoticon/          # EmoticonPicker
    │   │   ├── layout/            # Layout, Header, Sidebar
    │   │   │   └── NotificationBell.jsx  # 알림 벨 컴포넌트
    │   │   └── post/              # ContentRenderer
    │   ├── contexts/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── HomePage.jsx
    │   │   ├── BoardPage.jsx
    │   │   ├── PostDetailPage.jsx
    │   │   ├── WritePostPage.jsx
    │   │   ├── ProfilePage.jsx    # 내가 쓴 글 · 내가 쓴 댓글 · 설정
    │   │   ├── AdminPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   └── RegisterPage.jsx
    │   └── App.jsx
    ├── storage/
    │   └── server.log             # Vite 개발 서버 로그
    └── run.sh
```

---

## 데이터베이스 스키마

| 테이블 | 주요 컬럼 |
|--------|-----------|
| `users` | id, username, email, hashed_password, nickname, bio, avatar_url, is_admin, is_super_admin, suspended_until, suspend_reason |
| `categories` | id, name, slug, description, icon, order, is_active, admin_only |
| `posts` | id, title, content, user_id, category_id, view_count, is_pinned, is_notice, is_deleted, original_category_id |
| `comments` | id, content, user_id, post_id, parent_id, is_deleted |
| `likes` | id, user_id, post_id (nullable), comment_id (nullable) |
| `emoticons` | id, name, image_url, is_active |
| `notifications` | id, user_id, actor_id, type, post_id, comment_id, is_read |
| `site_settings` | key (PK), value — 사이트 설정 저장 (예: `best_post_min_likes`) |

> `site_settings` 기본값: `best_post_min_likes = 10`

---

## API 엔드포인트

### 회원 (`/api/users`)

| Method | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| POST | `/register` | — | 회원가입 |
| POST | `/login` | — | 로그인 → JWT 발급 |
| GET | `/me` | ✅ | 내 정보 조회 |
| PUT | `/me` | ✅ | 내 정보 수정 |
| POST | `/me/change-password` | ✅ | 비밀번호 변경 |
| DELETE | `/me` | ✅ | 계정 탈퇴 |
| GET | `/me/posts` | ✅ | 내가 쓴 글 목록 |
| GET | `/me/comments` | ✅ | 내가 쓴 댓글 목록 |
| GET | `/{user_id}` | — | 특정 사용자 조회 |

### 카테고리 (`/api/categories`)

| Method | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| GET | `` | — | 카테고리 목록 (게시글 수 포함) |
| POST | `` | ✅ 관리자 | 카테고리 생성 |

### 게시글 (`/api/posts`)

| Method | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| GET | `` | 선택 | 게시글 목록 (페이지네이션 · 카테고리 필터 · 검색) |
| POST | `` | ✅ | 게시글 작성 |
| GET | `/notices` | — | 공지사항 목록 (최대 10개) |
| GET | `/best` | — | 베스트 게시글 목록 |
| GET | `/{post_id}` | 선택 | 게시글 상세 (조회수 증가) |
| PUT | `/{post_id}` | ✅ 작성자 | 게시글 수정 |
| DELETE | `/{post_id}` | ✅ 작성자 | 게시글 삭제 |

### 댓글 (`/api/comments`)

| Method | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| GET | `?post_id={id}` | 선택 | 댓글 목록 (대댓글 포함) |
| POST | `` | ✅ | 댓글 / 대댓글 작성 → 관련 유저에게 알림 자동 생성 |
| PUT | `/{comment_id}` | ✅ 작성자 | 댓글 수정 |
| DELETE | `/{comment_id}` | ✅ 작성자 | 댓글 삭제 |

### 좋아요 (`/api/likes`)

| Method | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| POST | `/posts/{post_id}` | ✅ | 게시글 좋아요 토글 |
| POST | `/comments/{comment_id}` | ✅ | 댓글 좋아요 토글 |

### 이미지 업로드 (`/api/upload`)

| Method | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| POST | `/image` | ✅ | 이미지 업로드 (jpg · png · gif · webp, ≤ 10 MB) |

업로드된 이미지는 `/api/uploads/{filename}` 으로 접근합니다.

### 이모티콘 (`/api/emoticons`)

| Method | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| GET | `` | — | 활성화된 이모티콘 목록 |
| GET | `/all` | ✅ 관리자 | 전체 이모티콘 목록 (비활성 포함) |
| POST | `` | ✅ 관리자 | 이모티콘 등록 (이미지 업로드, ≤ 5 MB) |
| DELETE | `/{emoticon_id}` | ✅ 관리자 | 이모티콘 삭제 |
| PATCH | `/{emoticon_id}/toggle` | ✅ 관리자 | 활성화/비활성화 토글 |

### 알림 (`/api/notifications`)

| Method | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| GET | `?unread_only=false&limit=30` | ✅ | 내 알림 목록 |
| GET | `/unread-count` | ✅ | 미읽음 알림 수 |
| POST | `/{notification_id}/read` | ✅ | 단건 읽음 처리 |
| POST | `/read-all` | ✅ | 전체 읽음 처리 |

알림 타입: `comment_on_post` (내 게시글에 댓글), `reply_on_comment` (내 댓글에 대댓글)

### 관리자 (`/api/admin`) — 관리자 인증 필요

| Method | 경로 | 권한 | 설명 |
|--------|------|:----:|------|
| GET | `/stats` | 관리자 | 사이트 통계 |
| GET | `/users` | 관리자 | 회원 목록 (검색 · 페이지네이션) |
| PATCH | `/users/{user_id}/admin` | 슈퍼 관리자 | 관리자 권한 토글 |
| POST | `/users/{user_id}/suspend` | 관리자 | 활동 정지 설정 / 해제 |
| PATCH | `/posts/{post_id}/notice` | 관리자 | 공지 등록 / 해제 |
| DELETE | `/posts/{post_id}` | 관리자 | 게시글 강제 삭제 |
| DELETE | `/comments/{comment_id}` | 관리자 | 댓글 강제 삭제 |
| GET | `/settings/best-post-threshold` | 관리자 | 베스트 게시글 기준 조회 |
| PATCH | `/settings/best-post-threshold` | 관리자 | 베스트 게시글 기준 변경 |

---

## 프론트엔드 라우팅

| 경로 | 페이지 | 인증 |
|------|--------|:----:|
| `/` | 홈 (최신글 · 공지 요약) | — |
| `/board` | 전체 게시글 | — |
| `/board/:categorySlug` | 카테고리별 게시글 | — |
| `/board/best` | 베스트 게시글 | — |
| `/posts/:postId` | 게시글 상세 | — |
| `/write` | 글쓰기 | ✅ |
| `/posts/:postId/edit` | 글 수정 | ✅ 작성자 |
| `/profile` | 프로필 관리 (내 글 · 내 댓글 · 설정) | ✅ |
| `/admin` | 관리자 패널 | ✅ 관리자 |
| `/login` | 로그인 | — |
| `/register` | 회원가입 | — |

---

## 기본 카테고리

서버 최초 시작 시 아래 4개 카테고리가 자동으로 생성됩니다.

| slug | 이름 | 관리자 전용 |
|------|------|:-----------:|
| `notice` | 📌 공지사항 | ✅ |
| `free` | 💬 자유게시판 | — |
| `qna` | ❓ 질문/답변 | — |
| `info` | 📢 정보/공유 | — |
