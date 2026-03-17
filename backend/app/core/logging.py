import logging
import logging.handlers
from pathlib import Path


def setup_logging() -> logging.Logger:
    """
    로그 설정 초기화.

    - 콘솔(stdout): INFO 이상
    - storage/server.log: DEBUG 이상, 10 MB 단위로 최대 5개 파일 로테이션
    - uvicorn / sqlalchemy 로거도 동일 핸들러에 연결
    """

    # ── storage 폴더 생성 ──────────────────────────────────────────────────────
    log_dir = Path(__file__).resolve().parents[2] / "storage"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "server.log"

    # ── 포맷 ──────────────────────────────────────────────────────────────────
    fmt = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # ── 핸들러: 콘솔 ──────────────────────────────────────────────────────────
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(fmt)

    # ── 핸들러: 파일 (10 MB × 5개 로테이션) ──────────────────────────────────
    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(fmt)

    # ── 루트 로거 ─────────────────────────────────────────────────────────────
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    # 중복 핸들러 방지 (uvicorn --reload 시 재실행될 수 있음)
    if not root_logger.handlers:
        root_logger.addHandler(console_handler)
        root_logger.addHandler(file_handler)

    # ── uvicorn 로거를 루트에 위임 ────────────────────────────────────────────
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        uvi_logger = logging.getLogger(name)
        uvi_logger.handlers = []          # 기본 핸들러 제거
        uvi_logger.propagate = True       # 루트로 위임

    # ── SQLAlchemy 쿼리 로그 (DEBUG 환경에서만 활성화) ─────────────────────────
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if __debug__ else logging.WARNING
    )

    logger = logging.getLogger(__name__)
    logger.info("로깅 초기화 완료 — 로그 파일: %s", log_file)
    return logger
