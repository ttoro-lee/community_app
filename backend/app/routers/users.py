from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate, Token, LoginRequest, PasswordChange, DeleteAccount
from app.schemas.post import PaginatedPosts
from app.services import user_service
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """회원가입"""
    return user_service.create_user(db, user_data)


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """로그인"""
    return user_service.login_user(db, login_data.username, login_data.password)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """내 정보 조회"""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """내 정보 수정"""
    return user_service.update_user(db, current_user, update_data)


@router.post("/me/change-password", status_code=200)
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """비밀번호 변경"""
    user_service.change_password(db, current_user, data.current_password, data.new_password)
    return {"message": "비밀번호가 변경되었습니다."}


@router.delete("/me", status_code=200)
def delete_account(
    data: DeleteAccount,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """계정 탈퇴"""
    user_service.delete_account(db, current_user, data.password)
    return {"message": "계정이 탈퇴되었습니다."}


@router.get("/me/posts", response_model=PaginatedPosts)
def get_my_posts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """내가 작성한 글 목록"""
    result = user_service.get_my_posts(db, current_user.id, page, size)
    # build PostListResponse items
    from app.services.post_service import build_post_list_item
    result["items"] = [build_post_list_item(p, db, current_user) for p in result["items"]]
    return result


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """특정 사용자 조회"""
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user
