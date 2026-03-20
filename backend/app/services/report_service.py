from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from typing import List

from app.models.report import Report
from app.models.post import Post
from app.models.user import User
from app.schemas.report import (
    ReportCreate,
    PaginatedReportedPosts,
    ReportedPostItem,
    ReportResponse,
    ReporterInfo,
)


def create_report(db: Session, data: ReportCreate, reporter_id: int) -> Report:
    """게시글 신고 생성"""
    post = db.query(Post).filter(Post.id == data.post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if post.user_id == reporter_id:
        raise HTTPException(status_code=400, detail="본인의 게시글은 신고할 수 없습니다.")

    report = Report(
        post_id=data.post_id,
        reporter_id=reporter_id,
        reason=data.reason.strip(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def _build_report_response(db: Session, report: Report) -> ReportResponse:
    reporter_obj = db.query(User).filter(User.id == report.reporter_id).first()
    reporter_info = None
    if reporter_obj:
        reporter_info = ReporterInfo(
            id=reporter_obj.id,
            nickname=reporter_obj.nickname,
            username=reporter_obj.username,
        )
    return ReportResponse(
        id=report.id,
        post_id=report.post_id,
        reporter_id=report.reporter_id,
        reason=report.reason,
        is_resolved=report.is_resolved,
        created_at=report.created_at,
        reporter=reporter_info,
    )


def get_reported_posts(
    db: Session,
    page: int = 1,
    size: int = 20,
    include_resolved: bool = False,
) -> PaginatedReportedPosts:
    """신고된 게시글 목록 (신고 횟수 내림차순)"""

    # 신고가 존재하는 post_id 집합 (미처리 기준 또는 전체)
    report_filter = [] if include_resolved else [Report.is_resolved == False]

    # post_id 별 집계 서브쿼리
    agg_query = (
        db.query(
            Report.post_id,
            func.count(Report.id).label("report_count"),
            func.max(Report.created_at).label("latest_report_at"),
        )
        .filter(*report_filter)
        .group_by(Report.post_id)
        .subquery()
    )

    # 집계 결과와 게시글 조인
    joined = (
        db.query(Post, agg_query.c.report_count, agg_query.c.latest_report_at)
        .join(agg_query, Post.id == agg_query.c.post_id)
        .order_by(desc(agg_query.c.report_count), desc(agg_query.c.latest_report_at))
    )

    total = joined.count()
    rows = joined.offset((page - 1) * size).limit(size).all()

    items = []
    for post, report_count, latest_report_at in rows:
        author = db.query(User).filter(User.id == post.user_id).first()
        author_nickname = author.nickname if author else None

        # 개별 신고 목록 (최신순)
        reports_q: List[Report] = (
            db.query(Report)
            .filter(Report.post_id == post.id)
            .order_by(desc(Report.created_at))
            .all()
        )

        report_responses = [_build_report_response(db, r) for r in reports_q]
        unresolved = sum(1 for r in reports_q if not r.is_resolved)

        items.append(
            ReportedPostItem(
                post_id=post.id,
                post_title=post.title,
                post_is_deleted=post.is_deleted,
                author_nickname=author_nickname,
                report_count=report_count,
                unresolved_count=unresolved,
                latest_report_at=latest_report_at,
                reports=report_responses,
            )
        )

    return PaginatedReportedPosts(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=max(1, (total + size - 1) // size),
    )


def resolve_reports(db: Session, post_id: int) -> int:
    """특정 게시글의 모든 미처리 신고를 처리 완료로 표시"""
    reports = (
        db.query(Report)
        .filter(Report.post_id == post_id, Report.is_resolved == False)
        .all()
    )
    for r in reports:
        r.is_resolved = True
    db.commit()
    return len(reports)
