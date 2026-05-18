from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from auth import get_current_user, require_role, hash_password
from audit import log_action

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.manager)),
):
    return db.query(models.User).all()


@router.get("/reportees", response_model=List[schemas.UserOut])
def get_reportees(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.manager, models.UserRole.admin)),
):
    return db.query(models.User).filter(models.User.manager_id == current_user.id).all()


@router.post("/", response_model=schemas.UserOut)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin)),
):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        department_id=payload.department_id,
        manager_id=payload.manager_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, current_user.id, "CREATE_USER", "user", user.id, description=f"Created user {user.email}")
    return user


@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    log_action(db, current_user.id, "UPDATE_USER", "user", user_id)
    return user


@router.delete("/{user_id}")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}


# ── Departments ───────────────────────────────────────────────────────────────

@router.get("/departments/all", response_model=List[schemas.DepartmentOut])
def list_departments(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Department).all()


@router.post("/departments", response_model=schemas.DepartmentOut)
def create_department(
    payload: schemas.DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin)),
):
    dept = models.Department(name=payload.name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


# ── Thrust Areas ──────────────────────────────────────────────────────────────

@router.get("/thrust-areas/all", response_model=List[schemas.ThrustAreaOut])
def list_thrust_areas(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.ThrustArea).all()


@router.post("/thrust-areas", response_model=schemas.ThrustAreaOut)
def create_thrust_area(
    payload: schemas.ThrustAreaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin)),
):
    ta = models.ThrustArea(name=payload.name, description=payload.description)
    db.add(ta)
    db.commit()
    db.refresh(ta)
    return ta
