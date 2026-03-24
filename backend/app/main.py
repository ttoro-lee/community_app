import logging
import time
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text, inspect
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.database import Base, engine
from app.routers import users, posts, comments, likes, categories, admin
from app.routers import upload, emoticons, notifications, reports, wiki, arena
from app.services.category_service import seed_default_categories
from app.services.admin_service import seed_super_admin
from app.db.database import SessionLocal

# 가장 먼저 로깅 초기화
setup_logging()
logger = logging.getLogger(__name__)


def run_migrations():
    """
    create_all() 은 이미 존재하는 테이블에 새 컬럼을 추가하지 않는다.
    기존 테이블에 누락된 컬럼을 ALTER TABLE 로 안전하게 추가한다.
    """
    logger.info("DB 마이그레이션 시작")
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    with engine.begin() as conn:
        existing_user_cols = {c["name"] for c in inspector.get_columns("users")}

        added = []
        if "is_super_admin" not in existing_user_cols:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE"
            ))
            added.append("is_super_admin")

        if "suspended_until" not in existing_user_cols:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN suspended_until TIMESTAMPTZ"
            ))
            added.append("suspended_until")

        if "suspend_reason" not in existing_user_cols:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN suspend_reason VARCHAR(255)"
            ))
            added.append("suspend_reason")

        if added:
            logger.info("users 테이블 컬럼 추가: %s", ", ".join(added))

        # ── posts 테이블 컬럼 추가 ────────────────────────────────────────────
        existing_post_cols = {c["name"] for c in inspector.get_columns("posts")}
        added_posts = []

        if "is_notice" not in existing_post_cols:
            conn.execute(text(
                "ALTER TABLE posts ADD COLUMN is_notice BOOLEAN NOT NULL DEFAULT FALSE"
            ))
            added_posts.append("is_notice")

        if "original_category_id" not in existing_post_cols:
            conn.execute(text(
                "ALTER TABLE posts ADD COLUMN original_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL"
            ))
            added_posts.append("original_category_id")

        if added_posts:
            logger.info("posts 테이블 컬럼 추가: %s", ", ".join(added_posts))

        # ── categories 테이블 컬럼 추가 ──────────────────────────────────────
        existing_cat_cols = {c["name"] for c in inspector.get_columns("categories")}

        if "admin_only" not in existing_cat_cols:
            conn.execute(text(
                "ALTER TABLE categories ADD COLUMN admin_only BOOLEAN NOT NULL DEFAULT FALSE"
            ))
            logger.info("categories 테이블 컬럼 추가: admin_only")

        # ── 공지사항 카테고리 게시글 is_notice 보정 ──────────────────────────
        # admin_only 카테고리(공지사항)에 속한 게시글 중 is_notice=False인 것을 일괄 True로 변경
        conn.execute(text("""
            UPDATE posts
            SET is_notice = TRUE
            WHERE is_deleted = FALSE
              AND is_notice = FALSE
              AND category_id IN (
                  SELECT id FROM categories WHERE admin_only = TRUE
              )
        """))
        logger.info("공지사항 카테고리 게시글 is_notice 일괄 보정 완료")

        # ── site_settings 테이블 기본값 삽입 ─────────────────────────────────
        conn.execute(text("""
            INSERT INTO site_settings (key, value)
            VALUES ('best_post_min_likes', '10')
            ON CONFLICT (key) DO NOTHING
        """))
        logger.info("site_settings 기본값 보장 완료")

        # ── emoticons 테이블 컬럼 추가 (테이블은 create_all로 생성됨) ─────────
        # create_all이 이미 테이블을 만들었으므로 별도 작업 없음
        logger.info("emoticons 테이블 확인 완료")

        # ── notifications 테이블 (create_all로 생성됨) ────────────────────────
        logger.info("notifications 테이블 확인 완료")

        # ── reports 테이블 (create_all로 생성됨) ──────────────────────────────
        logger.info("reports 테이블 확인 완료")

        # ── wiki 테이블 (create_all로 생성됨) ─────────────────────────────────
        logger.info("wiki_documents / wiki_revisions 테이블 확인 완료")

        # ── arena 관련 테이블 (create_all로 생성됨) ────────────────────────────
        logger.info("arenas / arena_messages / arena_votes 테이블 확인 완료")

        # ── users 테이블에 api_key 컬럼 추가 ─────────────────────────────────
        existing_user_cols2 = {c["name"] for c in inspector.get_columns("users")}
        if "api_key" not in existing_user_cols2:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN api_key VARCHAR(64) UNIQUE"
            ))
            logger.info("users 테이블 api_key 컬럼 추가 완료")

        # ── notifications 테이블에 arena_id 컬럼 추가 (기존 테이블 대응) ──────
        existing_notif_cols = {c["name"] for c in inspector.get_columns("notifications")}
        if "arena_id" not in existing_notif_cols:
            conn.execute(text(
                "ALTER TABLE notifications ADD COLUMN arena_id INTEGER REFERENCES arenas(id) ON DELETE CASCADE"
            ))
            logger.info("notifications 테이블 arena_id 컬럼 추가 완료")

        if not added and not added_posts and "admin_only" in existing_cat_cols:
            logger.info("DB 마이그레이션 완료 — 변경 사항 없음")


run_migrations()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="커뮤니티 플랫폼 REST API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── HTTP 요청/응답 로깅 미들웨어 ───────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000

    # 헬스체크는 DEBUG 레벨로 줄임
    level = logging.DEBUG if request.url.path == "/api/health" else logging.INFO
    logger.log(
        level,
        "%s %s → %d  (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response

# Include routers
app.include_router(users.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(likes.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(emoticons.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(wiki.router, prefix="/api")
app.include_router(arena.router, prefix="/api")

from fastapi import Response as FastAPIResponse
from fastapi_mcp import FastApiMCP
import fastapi_mcp.openapi.utils as _mcp_utils


# ── MCP 인증 미들웨어 — /mcp 경로는 유효한 API 키 필요 ──────────────────────────
@app.middleware("http")
async def mcp_auth_middleware(request: Request, call_next):
    if request.url.path.startswith("/mcp"):
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return FastAPIResponse(
                content='{"detail":"MCP 접근에는 X-API-Key 헤더가 필요합니다."}',
                status_code=401,
                media_type="application/json",
            )
        db = SessionLocal()
        try:
            from app.models.user import User as UserModel
            user = db.query(UserModel).filter(
                UserModel.api_key == api_key,
                UserModel.is_active == True,
            ).first()
            if user is None:
                return FastAPIResponse(
                    content='{"detail":"유효하지 않은 API 키입니다."}',
                    status_code=401,
                    media_type="application/json",
                )
        finally:
            db.close()
    return await call_next(request)

def _safe_resolve_schema_references(schema_part, reference_schema, _visited=None):
    if _visited is None:
        _visited = set()
    schema_part = schema_part.copy()
    if "$ref" in schema_part:
        ref_path = schema_part["$ref"]
        if ref_path.startswith("#/components/schemas/"):
            model_name = ref_path.split("/")[-1]
            if model_name not in _visited:
                if "components" in reference_schema and "schemas" in reference_schema["components"]:
                    if model_name in reference_schema["components"]["schemas"]:
                        _visited = _visited | {model_name}
                        ref_schema = reference_schema["components"]["schemas"][model_name].copy()
                        schema_part.pop("$ref")
                        schema_part.update(ref_schema)
    for key, value in schema_part.items():
        if isinstance(value, dict):
            schema_part[key] = _safe_resolve_schema_references(value, reference_schema, _visited)
        elif isinstance(value, list):
            schema_part[key] = [
                _safe_resolve_schema_references(item, reference_schema, _visited) if isinstance(item, dict) else item
                for item in value
            ]
    return schema_part

_mcp_utils.resolve_schema_references = _safe_resolve_schema_references

# MCP에 노출할 태그 목록 (여기에 추가/제거하여 관리)
# 제외된 태그: Admin, Users, Notifications, Reports, Upload, Emoticons
MCP_INCLUDE_TAGS = [
    "Posts",
    "Comments",
    "Wiki",
    "Categories",
    "Likes",
    "Arena",
]

mcp = FastApiMCP(app, name="Community App", include_tags=MCP_INCLUDE_TAGS, headers=["authorization", "x-api-key"])
mcp.mount_http()

# 업로드된 이미지 정적 파일 서빙
_uploads_dir = Path(__file__).parent.parent / "storage" / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")


@app.on_event("startup")
def startup_event():
    """앱 시작 시 기본 카테고리 및 슈퍼 관리자 생성"""
    logger.info("═" * 50)
    logger.info("서버 시작  —  %s v%s", settings.APP_NAME, settings.APP_VERSION)
    logger.info("═" * 50)
    db = SessionLocal()
    try:
        seed_default_categories(db)
        # 환경 변수에 슈퍼 관리자 정보가 모두 설정된 경우에만 시드
        if all([
            settings.SUPER_ADMIN_USERNAME,
            settings.SUPER_ADMIN_EMAIL,
            settings.SUPER_ADMIN_PASSWORD,
            settings.SUPER_ADMIN_NICKNAME,
        ]):
            seed_super_admin(
                db,
                username=settings.SUPER_ADMIN_USERNAME,
                email=settings.SUPER_ADMIN_EMAIL,
                password=settings.SUPER_ADMIN_PASSWORD,
                nickname=settings.SUPER_ADMIN_NICKNAME,
            )
            logger.info("슈퍼 관리자 계정 확인 완료: %s", settings.SUPER_ADMIN_USERNAME)
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
