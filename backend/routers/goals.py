from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone
from database import get_db
import models, schemas
from auth import get_current_user, require_role
from audit import log_action
from progress import compute_progress_score

router = APIRouter(prefix="/api/goals", tags=["goals"])


# ── Goal Sheets ───────────────────────────────────────────────────────────────

@router.get("/sheets", response_model=List[schemas.GoalSheetOut])
def list_sheets(
    cycle_year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.GoalSheet).options(
        joinedload(models.GoalSheet.goals).joinedload(models.Goal.thrust_area),
        joinedload(models.GoalSheet.goals).joinedload(models.Goal.achievements),
        joinedload(models.GoalSheet.employee),
        joinedload(models.GoalSheet.manager),
    )
    if current_user.role == models.UserRole.employee:
        q = q.filter(models.GoalSheet.employee_id == current_user.id)
    elif current_user.role == models.UserRole.manager:
        reportee_ids = [u.id for u in current_user.reportees]
        q = q.filter(models.GoalSheet.employee_id.in_(reportee_ids + [current_user.id]))
    if cycle_year:
        q = q.filter(models.GoalSheet.cycle_year == cycle_year)
    return q.all()


@router.post("/sheets", response_model=schemas.GoalSheetOut)
def create_sheet(
    payload: schemas.GoalSheetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = db.query(models.GoalSheet).filter(
        models.GoalSheet.employee_id == current_user.id,
        models.GoalSheet.cycle_year == payload.cycle_year,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Goal sheet already exists for this cycle year")
    sheet = models.GoalSheet(
        employee_id=current_user.id,
        manager_id=current_user.manager_id,
        cycle_year=payload.cycle_year,
    )
    db.add(sheet)
    db.commit()
    db.refresh(sheet)
    return sheet


@router.get("/sheets/{sheet_id}", response_model=schemas.GoalSheetOut)
def get_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sheet = db.query(models.GoalSheet).options(
        joinedload(models.GoalSheet.goals).joinedload(models.Goal.thrust_area),
        joinedload(models.GoalSheet.goals).joinedload(models.Goal.achievements),
        joinedload(models.GoalSheet.employee),
        joinedload(models.GoalSheet.manager),
    ).filter(models.GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Goal sheet not found")
    _check_sheet_access(sheet, current_user)
    return sheet


@router.post("/sheets/{sheet_id}/submit")
def submit_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sheet = _get_my_sheet(sheet_id, current_user, db)
    if sheet.status not in (models.GoalStatus.draft, models.GoalStatus.returned):
        raise HTTPException(status_code=400, detail="Sheet cannot be submitted in its current state")
    # Validate total weightage = 100
    total = sum(g.weightage for g in sheet.goals)
    if abs(total - 100.0) > 0.01:
        raise HTTPException(status_code=400, detail=f"Total weightage must equal 100% (currently {total}%)")
    if len(sheet.goals) > 8:
        raise HTTPException(status_code=400, detail="Maximum 8 goals allowed per employee")
    sheet.status = models.GoalStatus.submitted
    sheet.submitted_at = datetime.now(timezone.utc)
    db.commit()
    log_action(db, current_user.id, "SUBMIT_SHEET", "goal_sheet", sheet_id)
    return {"message": "Goal sheet submitted successfully"}


@router.post("/sheets/{sheet_id}/approve")
def approve_sheet(
    sheet_id: int,
    payload: dict = {},
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.manager, models.UserRole.admin)),
):
    sheet = db.query(models.GoalSheet).filter(models.GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    if sheet.status != models.GoalStatus.submitted:
        raise HTTPException(status_code=400, detail="Sheet is not in submitted state")
    sheet.status = models.GoalStatus.approved
    sheet.approved_at = datetime.now(timezone.utc)
    sheet.manager_comment = payload.get("comment")
    db.commit()
    log_action(db, current_user.id, "APPROVE_SHEET", "goal_sheet", sheet_id)
    return {"message": "Goal sheet approved"}


@router.post("/sheets/{sheet_id}/return")
def return_sheet(
    sheet_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.manager, models.UserRole.admin)),
):
    sheet = db.query(models.GoalSheet).filter(models.GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    sheet.status = models.GoalStatus.returned
    sheet.manager_comment = payload.get("comment", "")
    db.commit()
    log_action(db, current_user.id, "RETURN_SHEET", "goal_sheet", sheet_id, description=payload.get("comment"))
    return {"message": "Goal sheet returned for rework"}


# ── Goals ─────────────────────────────────────────────────────────────────────

@router.post("/sheets/{sheet_id}/goals", response_model=schemas.GoalOut)
def add_goal(
    sheet_id: int,
    payload: schemas.GoalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sheet = _get_my_sheet(sheet_id, current_user, db)
    if sheet.status == models.GoalStatus.approved:
        raise HTTPException(status_code=403, detail="Goal sheet is locked after approval")
    if len(sheet.goals) >= 8:
        raise HTTPException(status_code=400, detail="Maximum 8 goals per employee")
    goal = models.Goal(goal_sheet_id=sheet_id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/goals/{goal_id}", response_model=schemas.GoalOut)
def update_goal(
    goal_id: int,
    payload: schemas.GoalUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    sheet = goal.goal_sheet
    _check_sheet_access(sheet, current_user)

    is_manager_editing = current_user.role in (models.UserRole.manager, models.UserRole.admin)

    if sheet.status == models.GoalStatus.approved and not is_manager_editing:
        raise HTTPException(status_code=403, detail="Goal sheet is locked")
    if goal.is_read_only and not is_manager_editing:
        raise HTTPException(status_code=403, detail="This goal is read-only for you")

    old_vals = {k: getattr(goal, k) for k in payload.model_dump(exclude_none=True)}
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)

    if sheet.status == models.GoalStatus.approved:
        log_action(
            db, current_user.id, "EDIT_LOCKED_GOAL", "goal", goal_id,
            old_values=old_vals, new_values=payload.model_dump(exclude_none=True),
            description="Goal edited after lock date",
        )
    return goal


@router.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    sheet = goal.goal_sheet
    _check_sheet_access(sheet, current_user)
    if sheet.status == models.GoalStatus.approved and current_user.role == models.UserRole.employee:
        raise HTTPException(status_code=403, detail="Goal sheet is locked")
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted"}


# ── Shared Goals ──────────────────────────────────────────────────────────────

@router.post("/share")
def share_goal(
    payload: schemas.SharedGoalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.manager, models.UserRole.admin)),
):
    source_goal = db.query(models.Goal).filter(models.Goal.id == payload.goal_id).first()
    if not source_goal:
        raise HTTPException(status_code=404, detail="Source goal not found")

    created = []
    for emp_id in payload.employee_ids:
        # Find or create the employee's goal sheet for same cycle year
        sheet = db.query(models.GoalSheet).filter(
            models.GoalSheet.employee_id == emp_id,
            models.GoalSheet.cycle_year == source_goal.goal_sheet.cycle_year,
        ).first()
        if not sheet:
            sheet = models.GoalSheet(
                employee_id=emp_id,
                manager_id=current_user.id,
                cycle_year=source_goal.goal_sheet.cycle_year,
            )
            db.add(sheet)
            db.flush()

        shared = models.Goal(
            goal_sheet_id=sheet.id,
            thrust_area_id=source_goal.thrust_area_id,
            title=source_goal.title,
            description=source_goal.description,
            uom_type=source_goal.uom_type,
            target_value=source_goal.target_value,
            target_date=source_goal.target_date,
            weightage=10.0,  # default, employee can adjust
            is_shared=True,
            shared_from_goal_id=source_goal.id,
            is_read_only=True,
        )
        db.add(shared)
        created.append(emp_id)

    db.commit()
    return {"message": f"Goal shared with {len(created)} employees"}


@router.put("/goals/{goal_id}/weightage")
def update_shared_goal_weightage(
    goal_id: int,
    payload: schemas.SharedGoalWeightageUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal or not goal.is_shared:
        raise HTTPException(status_code=404, detail="Shared goal not found")
    _check_sheet_access(goal.goal_sheet, current_user)
    goal.weightage = payload.weightage
    db.commit()
    return {"message": "Weightage updated"}


# ── Achievements ──────────────────────────────────────────────────────────────

@router.post("/goals/{goal_id}/achievements", response_model=schemas.AchievementOut)
def log_achievement(
    goal_id: int,
    payload: schemas.AchievementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    sheet = goal.goal_sheet
    _check_sheet_access(sheet, current_user)
    if sheet.status != models.GoalStatus.approved:
        raise HTTPException(status_code=400, detail="Goals must be approved before logging achievements")

    existing = db.query(models.Achievement).filter(
        models.Achievement.goal_id == goal_id,
        models.Achievement.quarter == payload.quarter,
        models.Achievement.cycle_year == payload.cycle_year,
    ).first()

    score = compute_progress_score(
        goal.uom_type, goal.target_value, payload.actual_value,
        goal.target_date, payload.actual_date,
    )

    # If it's a shared goal, sync to primary owner
    if goal.shared_from_goal_id:
        parent_goal = db.query(models.Goal).filter(models.Goal.id == goal.shared_from_goal_id).first()
        if parent_goal:
            _upsert_achievement(db, parent_goal, payload, score)

    if existing:
        existing.actual_value = payload.actual_value
        existing.actual_date = payload.actual_date
        existing.status = payload.status
        existing.progress_score = score
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return existing

    ach = models.Achievement(
        goal_id=goal_id,
        quarter=payload.quarter,
        cycle_year=payload.cycle_year,
        actual_value=payload.actual_value,
        actual_date=payload.actual_date,
        status=payload.status,
        progress_score=score,
        notes=payload.notes,
    )
    db.add(ach)
    db.commit()
    db.refresh(ach)
    return ach


def _upsert_achievement(db, goal, payload, score):
    existing = db.query(models.Achievement).filter(
        models.Achievement.goal_id == goal.id,
        models.Achievement.quarter == payload.quarter,
        models.Achievement.cycle_year == payload.cycle_year,
    ).first()
    if existing:
        existing.actual_value = payload.actual_value
        existing.progress_score = score
        existing.status = payload.status
    else:
        db.add(models.Achievement(
            goal_id=goal.id, quarter=payload.quarter, cycle_year=payload.cycle_year,
            actual_value=payload.actual_value, actual_date=payload.actual_date,
            status=payload.status, progress_score=score,
        ))


# ── Check-ins ─────────────────────────────────────────────────────────────────

@router.post("/sheets/{sheet_id}/checkins", response_model=schemas.CheckInOut)
def add_checkin(
    sheet_id: int,
    payload: schemas.CheckInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.manager, models.UserRole.admin)),
):
    sheet = db.query(models.GoalSheet).filter(models.GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    checkin = models.CheckIn(
        goal_sheet_id=sheet_id,
        manager_id=current_user.id,
        quarter=payload.quarter,
        cycle_year=payload.cycle_year,
        comment=payload.comment,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin


@router.get("/sheets/{sheet_id}/checkins", response_model=List[schemas.CheckInOut])
def get_checkins(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.CheckIn).filter(models.CheckIn.goal_sheet_id == sheet_id).all()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_my_sheet(sheet_id: int, user: models.User, db: Session) -> models.GoalSheet:
    sheet = db.query(models.GoalSheet).options(
        joinedload(models.GoalSheet.goals)
    ).filter(models.GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    if sheet.employee_id != user.id and user.role not in (models.UserRole.manager, models.UserRole.admin):
        raise HTTPException(status_code=403, detail="Access denied")
    return sheet


def _check_sheet_access(sheet: models.GoalSheet, user: models.User):
    if user.role == models.UserRole.admin:
        return
    if user.role == models.UserRole.manager:
        reportee_ids = [u.id for u in user.reportees]
        if sheet.employee_id not in reportee_ids and sheet.employee_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        return
    if sheet.employee_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
