# 커뮤니티 웹 애플리케이션

FastAPI + PostgreSQL + React(Vite)로 구축된 풀스택 커뮤니티 플랫폼입니다.

# claude code plagin

- code-review-graph : Claude Code 토큰 사용량을 최적화하는 로컬 지식 그래프

```
플러그인 설치
claude plugin marketplace add tirth8205/code-review-graph
claude plugin install code-review-graph@code-review-graph

claude 실행 후

/build-graph 또는
"Build the code review graph for this project."
```

## 미리보기

![커뮤니티 홈 화면](./docs/preview.png)

---

## 기술 스택

| 구분           | 기술                                                    |
| -------------- | ------------------------------------------------------- |
| **백엔드**     | FastAPI, SQLAlchemy (ORM), PostgreSQL, JWT (Bearer)     |
| **프론트엔드** | React 18, Vite, React Query, React Router v6            |
| **실시간**     | WebSocket (아레나 실시간 배틀)                          |
| **MCP**        | fastapi-mcp (AI 에이전트 API 키 통합)                   |
| **기타**       | Pydantic v2, pydantic-settings, python-jose, bcrypt, uv |

---

## 주요 기능

### 회원 시스템

- 회원가입 / 로그인 (JWT Bearer 토큰, 24시간 유효)
- 아이디 중복 확인 (회원가입 시 실시간 체크)
- 프로필 수정 (닉네임, 자기소개, 아바타 이미지)
- 비밀번호 변경
- 계정 탈퇴 (비밀번호 확인 후 처리)
- 내가 쓴 글 목록 조회
- 내가 쓴 댓글 목록 조회 (댓글 / 대댓글 구분)
- API 키 발급 / 재발급 / 조회 (MCP 연동용)

### 알림

- 내 게시글에 댓글 또는 대댓글이 달리면 알림 생성
- 내 댓글에 대댓글이 달리면 알림 생성 (중복 수신 방지)
- 아레나 초대 수신 시 알림 생성
- 자기 자신의 글 / 댓글에는 알림 생성 안 함
- 헤더 벨 아이콘에 미읽음 수 뱃지 표시 (30초 폴링)
- 알림 클릭 시 해당 게시글 또는 아레나로 이동 및 읽음 처리
- 단건 읽음 / 전체 읽음 지원

### 게시판

- **다중 카테고리** 지원 (자유게시판 · 질문/답변 · 정보/공유 · 공지사항)
- 게시글 작성 / 수정 / 삭제 / 상세 조회
- 제목 + 본문 통합 검색
- 페이지네이션
- 게시글 핀 고정 (`is_pinned`)
- 이미지 첨부 — 3가지 방법 지원:
  - 파일 선택 버튼 (jpg · png · gif · webp, 최대 10 MB)
  - 드래그 앤 드롭
  - 클립보드 붙여넣기 (Ctrl+V)
- YouTube / Chzzk 영상 URL 임베드
- 이모티콘 피커로 커스텀 이모티콘 삽입
- 게시글 신고 (사용자당 1회, 중복 신고 방지)

### 공지사항

- 관리자가 일반 게시글을 공지사항으로 등록 / 해제
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
- 게시글 작성 시 이모티콘 피커에서 선택하여 삽입
- 이미지 형식: jpg · png · gif · webp, 최대 5 MB

### 위키 (Wiki)

- 누구나 위키 문서 열람 (조회수 증가)
- 로그인한 사용자라면 위키 문서 생성 및 수정 가능
- **섹션 기반 편집**: 단락(heading + content) 단위로 구성
- **리비전 히스토리**: 모든 수정 이력 보존, 과거 버전 열람 가능
- 제목 검색 지원, 페이지네이션
- 본문 내 하이퍼링크 마크다운 `[텍스트](url)` 지원
- 관리자: 위키 문서 삭제 가능

### 아레나 (Arena)

- 두 유저가 맞붙는 **실시간 토론 배틀** 기능
- **초대 → 수락 / 거절 → 진행 → 종료** 4단계 상태 흐름
- **WebSocket 실시간 통신**: 메시지, 투표 수, 관전자 수 즉시 반영
- 진행 시간 선택: 5 / 10 / 15 / 20 / 25 / 30분
- 아레나 참가자는 실시간 채팅으로 토론
- 관전자는 승자에게 투표 (참가자 본인은 투표 불가)
- 종료 후 투표 마감 및 결과 표시 (무승부 포함 0:0 포함)
- 관리자: 아레나 목록에서 아레나 삭제 가능

### 신고 관리

- 게시글 작성자 본인을 제외한 누구나 신고 가능
- 동일 게시글 중복 신고 방지 (DB UniqueConstraint + 서비스 레벨 409 처리)
- 신고 후 버튼이 "신고됨" 상태로 변경 (비활성화)
- 관리자 패널에서 신고 목록 조회, 게시글 본문 미리보기(최대 500자), 해결 처리

#### MCP 서버 등록 예시 (Claude Code / Claude Desktop)

**1. API 키 발급**

프로필 페이지에서 API 키를 발급합니다.

**2. `claude_desktop_config.json` 또는 `.claude/settings.json`에 등록**

```json
{
  "mcpServers": {
    "community-app": {
      "type": "http",
      "url": "http://localhost:8000/mcp",
      "headers": {
        "X-API-Key": "<your_api_key>"
      }
    }
  }
}
```

등록 후 Claude에서 게시글 조회, 댓글 작성, 아레나 참여 등 모든 API를 자연어로 호출할 수 있습니다.

### 관리자 패널 (`/admin`)

- 사이트 통계 (전체 회원 · 게시글 · 댓글 · 관리자 수)
- 회원 목록 조회 및 검색
- 활동 정지 설정 (1일 / 3일 / 7일 / 14일 / 30일 / 1년) 및 해제
- 관리자 권한 부여 / 해제 (슈퍼 관리자 전용)
- 게시글 / 댓글 강제 삭제
- 공지사항 등록 / 해제
- 베스트 게시글 최소 좋아요 수 설정
- 이모티콘 관리 (등록 · 삭제 · 활성화 토글)
- 카테고리 관리 (생성 · 수정 · 삭제)
- 신고 목록 조회, 게시글 본문 확인, 신고 해결 처리

### 권한 체계

| 등급                           | 설명                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 일반 유저                      | 게시글 · 댓글 CRUD, 좋아요, 신고, 위키 편집, 아레나 참여                                                                              |
| 관리자 (`is_admin`)            | + 공지 등록/해제, 게시글/댓글 강제 삭제, 회원 정지, 베스트 설정 변경, 이모티콘 관리, 카테고리 관리, 신고 처리, 아레나 삭제, 위키 삭제 |
| 슈퍼 관리자 (`is_super_admin`) | + 관리자 권한 부여/해제                                                                                                               |

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

## 인증 방식

API는 두 가지 인증 방법을 지원합니다.

| 방법            | 헤더                            | 설명                                               |
| --------------- | ------------------------------- | -------------------------------------------------- |
| JWT Bearer 토큰 | `Authorization: Bearer <token>` | 로그인 후 발급. 24시간 유효                        |
| API 키          | `X-API-Key: <api_key>`          | 프로필 페이지에서 발급. MCP / 외부 에이전트 연동용 |

> X-API-Key가 있으면 Bearer 토큰보다 우선 적용됩니다.

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
├── run.sh                          # 전체 background 실행
├── stop.sh                         # 전체 종료
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 앱 진입점 · 자동 마이그레이션
│   │   ├── dependencies.py         # JWT 인증 의존성
│   │   ├── routers/
│   │   │   ├── users.py            # 회원 API
│   │   │   ├── posts.py            # 게시글 API
│   │   │   ├── comments.py         # 댓글 API
│   │   │   ├── likes.py            # 좋아요 API
│   │   │   ├── categories.py       # 카테고리 API
│   │   │   ├── admin.py            # 관리자 API
│   │   │   ├── upload.py           # 이미지 업로드 API
│   │   │   ├── emoticons.py        # 이모티콘 API
│   │   │   ├── notifications.py    # 알림 API
│   │   │   ├── reports.py          # 신고 API
│   │   │   ├── wiki.py             # 위키 API
│   │   │   └── arena.py            # 아레나 API + WebSocket
│   │   ├── core/
│   │   │   ├── config.py           # 환경 변수 설정
│   │   │   ├── security.py         # 비밀번호 해싱 · JWT
│   │   │   └── logging.py          # 로깅 설정
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── category.py
│   │   │   ├── post.py
│   │   │   ├── comment.py
│   │   │   ├── like.py
│   │   │   ├── emoticon.py
│   │   │   ├── notification.py
│   │   │   ├── settings.py         # 사이트 설정 (key-value)
│   │   │   ├── report.py           # 신고 모델 (UniqueConstraint 포함)
│   │   │   ├── wiki.py             # WikiDocument, WikiRevision
│   │   │   └── arena.py            # Arena, ArenaMessage, ArenaVote
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── post.py             # is_liked, is_reported 포함
│   │   │   ├── comment.py          # MyCommentItem, PaginatedMyComments 포함
│   │   │   ├── category.py
│   │   │   ├── admin.py
│   │   │   ├── emoticon.py
│   │   │   ├── notification.py
│   │   │   ├── report.py           # post_content 미리보기 포함
│   │   │   ├── wiki.py
│   │   │   └── arena.py
│   │   ├── services/
│   │   │   ├── user_service.py
│   │   │   ├── post_service.py     # is_reported 조회 포함
│   │   │   ├── comment_service.py
│   │   │   ├── like_service.py
│   │   │   ├── category_service.py
│   │   │   ├── admin_service.py
│   │   │   ├── emoticon_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── report_service.py   # 중복 신고 방지 포함
│   │   │   ├── wiki_service.py
│   │   │   └── arena_service.py    # 자동 종료 · 투표 · 삭제 포함
│   │   └── db/
│   │       └── database.py         # DB 연결 · 세션
│   ├── storage/
│   │   ├── server.log              # 서버 로그 (uvicorn + 앱 통합)
│   │   └── uploads/                # 업로드 이미지 저장소
│   │       └── emoticons/          # 이모티콘 이미지
│   └── run.sh
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.js
    │   │   ├── posts.js
    │   │   ├── auth.js             # getMyComments 포함
    │   │   ├── admin.js
    │   │   ├── emoticons.js
    │   │   ├── notifications.js
    │   │   ├── reports.js
    │   │   ├── wiki.js
    │   │   └── arena.js            # deleteArena 포함
    │   ├── components/
    │   │   ├── board/              # PostCard, NoticeBar
    │   │   ├── comment/            # CommentItem
    │   │   ├── emoticon/           # EmoticonPicker
    │   │   ├── layout/             # Layout, Header, Sidebar, NotificationBell
    │   │   ├── post/               # ContentRenderer
    │   │   └── report/             # ReportModal
    │   ├── contexts/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── HomePage.jsx
    │   │   ├── BoardPage.jsx
    │   │   ├── PostDetailPage.jsx  # 신고 버튼 · 신고됨 상태 포함
    │   │   ├── WritePostPage.jsx   # 이미지 파일/드래그/붙여넣기, 영상 URL, 이모티콘
    │   │   ├── ProfilePage.jsx     # 내가 쓴 글 · 내가 쓴 댓글 · 설정
    │   │   ├── AdminPage.jsx       # 신고 본문 미리보기 포함
    │   │   ├── WikiListPage.jsx
    │   │   ├── WikiDetailPage.jsx
    │   │   ├── WikiEditPage.jsx
    │   │   ├── WikiHistoryPage.jsx
    │   │   ├── ArenaListPage.jsx   # 관리자 삭제 버튼 포함
    │   │   ├── ArenaDetailPage.jsx # 실시간 배틀 · 투표 · 무승부 표시
    │   │   ├── LoginPage.jsx
    │   │   └── RegisterPage.jsx
    │   └── App.jsx
    ├── storage/
    │   └── server.log              # Vite 개발 서버 로그
    └── run.sh
```

---

## 데이터베이스 스키마

| 테이블           | 주요 컬럼                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `users`          | id, username, email, hashed_password, nickname, bio, avatar_url, is_admin, is_super_admin, suspended_until, suspend_reason, api_key |
| `categories`     | id, name, slug, description, icon, order, is_active, admin_only                                                                     |
| `posts`          | id, title, content, user_id, category_id, view_count, is_pinned, is_notice, is_deleted, original_category_id                        |
| `comments`       | id, content, user_id, post_id, parent_id, is_deleted                                                                                |
| `likes`          | id, user_id, post_id (nullable), comment_id (nullable)                                                                              |
| `emoticons`      | id, name, image_url, is_active                                                                                                      |
| `notifications`  | id, user_id, actor_id, type, post_id, comment_id, arena_id, is_read                                                                 |
| `site_settings`  | key (PK), value — 사이트 설정 저장 (예: `best_post_min_likes`)                                                                      |
| `reports`        | id, post_id, reporter_id, reason, is_resolved — UNIQUE(post_id, reporter_id)                                                        |
| `wiki_documents` | id, title, created_by_id, view_count, is_deleted                                                                                    |
| `wiki_revisions` | id, wiki_id, editor_id, sections (JSON), comment, created_at                                                                        |
| `arenas`         | id, creator_id, opponent_id, duration_minutes, status, started_at, ends_at                                                          |
| `arena_messages` | id, arena_id, user_id, content, created_at                                                                                          |
| `arena_votes`    | id, arena_id, voter_id, voted_for_id — UNIQUE(arena_id, voter_id)                                                                   |

> `site_settings` 기본값: `best_post_min_likes = 10`

> 아레나 상태 흐름: `pending` → `active` → `finished` / `pending` → `declined`

---

## API 엔드포인트

### 회원 (`/api/users`)

| Method | 경로                  | 인증 | 설명                       |
| ------ | --------------------- | :--: | -------------------------- |
| POST   | `/register`           |  —   | 회원가입                   |
| GET    | `/check-username`     |  —   | 아이디 중복 확인           |
| POST   | `/login`              |  —   | 로그인 → JWT 발급          |
| GET    | `/me`                 |  ✅  | 내 정보 조회               |
| PUT    | `/me`                 |  ✅  | 내 정보 수정               |
| POST   | `/me/change-password` |  ✅  | 비밀번호 변경              |
| DELETE | `/me`                 |  ✅  | 계정 탈퇴                  |
| GET    | `/me/posts`           |  ✅  | 내가 쓴 글 목록            |
| GET    | `/me/comments`        |  ✅  | 내가 쓴 댓글 목록          |
| POST   | `/me/api-key`         |  ✅  | API 키 발급 / 재발급 (MCP) |
| GET    | `/me/api-key`         |  ✅  | API 키 조회                |
| GET    | `/{user_id}`          |  —   | 특정 사용자 조회           |

### 카테고리 (`/api/categories`)

| Method | 경로 |   인증    | 설명                           |
| ------ | ---- | :-------: | ------------------------------ |
| GET    | ``   |     —     | 카테고리 목록 (게시글 수 포함) |
| POST   | ``   | ✅ 관리자 | 카테고리 생성                  |

### 게시글 (`/api/posts`)

| Method | 경로                  |   인증    | 설명                                                   |
| ------ | --------------------- | :-------: | ------------------------------------------------------ |
| GET    | ``                    |   선택    | 게시글 목록 (페이지네이션 · 카테고리 필터 · 검색)      |
| POST   | ``                    |    ✅     | 게시글 작성                                            |
| GET    | `/notices`            |     —     | 공지사항 목록 (최대 10개)                              |
| GET    | `/best`               |     —     | 베스트 게시글 목록                                     |
| GET    | `/{post_id}`          |   선택    | 게시글 상세 (조회수 증가, is_liked · is_reported 포함) |
| GET    | `/{post_id}/adjacent` |     —     | 이전 / 다음 게시글 조회                                |
| PUT    | `/{post_id}`          | ✅ 작성자 | 게시글 수정                                            |
| DELETE | `/{post_id}`          | ✅ 작성자 | 게시글 삭제                                            |

### 댓글 (`/api/comments`)

| Method | 경로            |   인증    | 설명                                              |
| ------ | --------------- | :-------: | ------------------------------------------------- |
| GET    | `?post_id={id}` |   선택    | 댓글 목록 (대댓글 포함)                           |
| POST   | ``              |    ✅     | 댓글 / 대댓글 작성 → 관련 유저에게 알림 자동 생성 |
| PUT    | `/{comment_id}` | ✅ 작성자 | 댓글 수정                                         |
| DELETE | `/{comment_id}` | ✅ 작성자 | 댓글 삭제                                         |

### 좋아요 (`/api/likes`)

| Method | 경로                     | 인증 | 설명               |
| ------ | ------------------------ | :--: | ------------------ |
| POST   | `/posts/{post_id}`       |  ✅  | 게시글 좋아요 토글 |
| POST   | `/comments/{comment_id}` |  ✅  | 댓글 좋아요 토글   |

### 이미지 업로드 (`/api/upload`)

| Method | 경로     | 인증 | 설명                                            |
| ------ | -------- | :--: | ----------------------------------------------- |
| POST   | `/image` |  ✅  | 이미지 업로드 (jpg · png · gif · webp, ≤ 10 MB) |

업로드된 이미지는 `/api/uploads/{filename}` 으로 접근합니다.

### 이모티콘 (`/api/emoticons`)

| Method | 경로                    |   인증    | 설명                                  |
| ------ | ----------------------- | :-------: | ------------------------------------- |
| GET    | ``                      |     —     | 활성화된 이모티콘 목록                |
| GET    | `/all`                  | ✅ 관리자 | 전체 이모티콘 목록 (비활성 포함)      |
| POST   | ``                      | ✅ 관리자 | 이모티콘 등록 (이미지 업로드, ≤ 5 MB) |
| DELETE | `/{emoticon_id}`        | ✅ 관리자 | 이모티콘 삭제                         |
| PATCH  | `/{emoticon_id}/toggle` | ✅ 관리자 | 활성화/비활성화 토글                  |

### 알림 (`/api/notifications`)

| Method | 경로                          | 인증 | 설명           |
| ------ | ----------------------------- | :--: | -------------- |
| GET    | `?unread_only=false&limit=30` |  ✅  | 내 알림 목록   |
| GET    | `/unread-count`               |  ✅  | 미읽음 알림 수 |
| POST   | `/{notification_id}/read`     |  ✅  | 단건 읽음 처리 |
| POST   | `/read-all`                   |  ✅  | 전체 읽음 처리 |

알림 타입: `comment_on_post` (내 게시글에 댓글), `reply_on_comment` (내 댓글에 대댓글), `arena_invite` (아레나 초대)

### 신고 (`/api/reports`)

| Method | 경로 | 인증 | 설명                                                |
| ------ | ---- | :--: | --------------------------------------------------- |
| POST   | ``   |  ✅  | 게시글 신고 (사용자당 동일 게시글 1회, 중복 시 409) |

### 위키 (`/api/wiki`)

| Method | 경로                                 |   인증    | 설명                                 |
| ------ | ------------------------------------ | :-------: | ------------------------------------ |
| GET    | ``                                   |     —     | 위키 문서 목록 (검색 · 페이지네이션) |
| POST   | ``                                   |    ✅     | 위키 문서 생성                       |
| GET    | `/{wiki_id}`                         |     —     | 위키 문서 단건 조회 (조회수 증가)    |
| PUT    | `/{wiki_id}`                         |    ✅     | 위키 문서 수정 (새 리비전 생성)      |
| GET    | `/{wiki_id}/revisions`               |     —     | 리비전 목록                          |
| GET    | `/{wiki_id}/revisions/{revision_id}` |     —     | 특정 리비전 조회                     |
| DELETE | `/{wiki_id}`                         | ✅ 관리자 | 위키 문서 삭제                       |

### 아레나 (`/api/arenas`)

| Method | 경로                   |   인증    | 설명                                   |
| ------ | ---------------------- | :-------: | -------------------------------------- |
| GET    | ``                     |   선택    | 아레나 목록 (상태 필터 · 페이지네이션) |
| POST   | ``                     |    ✅     | 아레나 생성 (상대방에게 초대 알림)     |
| GET    | `/{arena_id}`          |   선택    | 아레나 단건 조회                       |
| DELETE | `/{arena_id}`          | ✅ 관리자 | 아레나 삭제                            |
| POST   | `/{arena_id}/accept`   |    ✅     | 아레나 수락                            |
| POST   | `/{arena_id}/decline`  |    ✅     | 아레나 거절                            |
| GET    | `/{arena_id}/messages` |     —     | 채팅 메시지 목록                       |
| POST   | `/{arena_id}/messages` |    ✅     | 채팅 메시지 전송 (참가자 전용)         |
| POST   | `/{arena_id}/vote`     |    ✅     | 투표 (관전자 전용, 변경 가능)          |
| GET    | `/{arena_id}/votes`    |   선택    | 투표 현황 조회                         |
| GET    | `/users/search`        |    ✅     | 아레나 상대방 유저 검색                |
| WS     | `/{arena_id}/ws`       |     —     | WebSocket 실시간 연결                  |

WebSocket 이벤트 타입: `arena_started`, `arena_ended`, `message`, `vote_update`, `spectator_count`

### 관리자 (`/api/admin`) — 관리자 인증 필요

| Method | 경로                            |    권한     | 설명                                  |
| ------ | ------------------------------- | :---------: | ------------------------------------- |
| GET    | `/stats`                        |   관리자    | 사이트 통계                           |
| GET    | `/users`                        |   관리자    | 회원 목록 (검색 · 페이지네이션)       |
| PATCH  | `/users/{user_id}/admin`        | 슈퍼 관리자 | 관리자 권한 토글                      |
| POST   | `/users/{user_id}/suspend`      |   관리자    | 활동 정지 설정 / 해제                 |
| PATCH  | `/posts/{post_id}/notice`       |   관리자    | 공지 등록 / 해제                      |
| DELETE | `/posts/{post_id}`              |   관리자    | 게시글 강제 삭제                      |
| DELETE | `/comments/{comment_id}`        |   관리자    | 댓글 강제 삭제                        |
| GET    | `/settings/best-post-threshold` |   관리자    | 베스트 게시글 기준 조회               |
| PATCH  | `/settings/best-post-threshold` |   관리자    | 베스트 게시글 기준 변경               |
| GET    | `/categories`                   |   관리자    | 전체 카테고리 목록 (비활성 포함)      |
| POST   | `/categories`                   |   관리자    | 카테고리 생성                         |
| PATCH  | `/categories/{cat_id}`          |   관리자    | 카테고리 수정                         |
| DELETE | `/categories/{cat_id}`          |   관리자    | 카테고리 삭제                         |
| GET    | `/reports`                      |   관리자    | 신고 목록 (게시글 본문 미리보기 포함) |
| PATCH  | `/reports/{post_id}/resolve`    |   관리자    | 신고 해결 처리                        |

---

## 프론트엔드 라우팅

| 경로                    | 페이지                               |   인증    |
| ----------------------- | ------------------------------------ | :-------: |
| `/`                     | 홈 (최신글 · 카테고리 요약)          |     —     |
| `/board`                | 전체 게시글                          |     —     |
| `/board/:categorySlug`  | 카테고리별 게시글                    |     —     |
| `/board/best`           | 베스트 게시글                        |     —     |
| `/posts/:postId`        | 게시글 상세                          |     —     |
| `/write`                | 글쓰기                               |    ✅     |
| `/posts/:postId/edit`   | 글 수정                              | ✅ 작성자 |
| `/profile`              | 프로필 관리 (내 글 · 내 댓글 · 설정) |    ✅     |
| `/admin`                | 관리자 패널                          | ✅ 관리자 |
| `/wiki`                 | 위키 문서 목록                       |     —     |
| `/wiki/new`             | 위키 문서 작성                       |    ✅     |
| `/wiki/:wikiId`         | 위키 문서 상세                       |     —     |
| `/wiki/:wikiId/edit`    | 위키 문서 편집                       |    ✅     |
| `/wiki/:wikiId/history` | 위키 리비전 히스토리                 |     —     |
| `/arena`                | 아레나 목록                          |     —     |
| `/arena/:arenaId`       | 아레나 상세 (실시간 배틀)            |     —     |
| `/login`                | 로그인                               |     —     |
| `/register`             | 회원가입                             |     —     |

---

## 기본 카테고리

서버 최초 시작 시 아래 4개 카테고리가 자동으로 생성됩니다.

| slug     | 이름          | 관리자 전용 |
| -------- | ------------- | :---------: |
| `notice` | 📌 공지사항   |     ✅      |
| `free`   | 💬 자유게시판 |      —      |
| `qna`    | ❓ 질문/답변  |      —      |
| `info`   | 📢 정보/공유  |      —      |
