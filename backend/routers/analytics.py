from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from database import get_db
import models
from auth import require_role

router = APIRouter(tags=["analytics"])

QUARTERS = ["q1", "q2", "q3", "q4"]


@router.get("/qoq-trends")
def qoq_trends(
    cycle_year: int = Query(...),
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.manager)),
):
    """Quarter-on-Quarter goal achievement trends."""
    result = []
    for quarter in QUARTERS:
        q = db.query(models.Achievement).join(models.Goal).join(models.GoalSheet)
        q = q.filter(
            models.Achievement.cycle_year == cycle_year,
            models.Achievement.quarter == quarter,
        )
        if employee_id:
            q = q.filter(models.GoalSheet.employee_id == employee_id)
        if department_id:
            q = q.join(models.User, models.GoalSheet.employee_id == models.User.id)
            q = q.filter(models.User.department_id == department_id)

        achievements = q.all()
        total = len(achievements)
        if total == 0:
            result.append({"quarter": quarter.upper(), "avg_score": 0, "completed": 0, "total": 0})
            continue
        scores = [a.progress_score for a in achievements if a.progress_score is not None]
        avg = (sum(scores) / len(scores) * 100) if scores else 0
        completed = sum(1 for a in achievements if a.status == models.AchievementStatus.completed)
        result.append({
            "quarter": quarter.upper(),
            "avg_score": round(avg, 1),
            "completed": completed,
            "total": total,
        })
    return result


@router.get("/heatmap")
def completion_heatmap(
    cycle_year: int = Query(...),
    group_by: str = Query("department", description="department | manager"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.manager)),
):
    """Heatmap showing completion rates per quarter per group."""
    if group_by == "department":
        groups = db.query(models.Department).all()
        result = []
        for dept in groups:
            entry = {"name": dept.name}
            for q in QUARTERS:
                total = db.query(models.Achievement).join(models.Goal).join(models.GoalSheet).join(
                    models.User, models.GoalSheet.employee_id == models.User.id
                ).filter(
                    models.User.department_id == dept.id,
                    models.Achievement.cycle_year == cycle_year,
                    models.Achievement.quarter == q,
                ).count()
                completed = db.query(models.Achievement).join(models.Goal).join(models.GoalSheet).join(
                    models.User, models.GoalSheet.employee_id == models.User.id
                ).filter(
                    models.User.department_id == dept.id,
                    models.Achievement.cycle_year == cycle_year,
                    models.Achievement.quarter == q,
                    models.Achievement.status == models.AchievementStatus.completed,
                ).count()
                entry[q] = round((completed / total * 100) if total > 0 else 0, 1)
            result.append(entry)
        return result

    elif group_by == "manager":
        managers = db.query(models.User).filter(models.User.role == models.UserRole.manager).all()
        result = []
        for mgr in managers:
            reportee_ids = [u.id for u in mgr.reportees]
            if not reportee_ids:
                continue
            entry = {"name": mgr.name}
            for q in QUARTERS:
                total = db.query(models.Achievement).join(models.Goal).join(models.GoalSheet).filter(
                    models.GoalSheet.employee_id.in_(reportee_ids),
                    models.Achievement.cycle_year == cycle_year,
                    models.Achievement.quarter == q,
                ).count()
                completed = db.query(models.Achievement).join(models.Goal).join(models.GoalSheet).filter(
                    models.GoalSheet.employee_id.in_(reportee_ids),
                    models.Achievement.cycle_year == cycle_year,
                    models.Achievement.quarter == q,
                    models.Achievement.status == models.AchievementStatus.completed,
                ).count()
                entry[q] = round((completed / total * 100) if total > 0 else 0, 1)
            result.append(entry)
        return result

    return []


@router.get("/goal-distribution")
def goal_distribution(
    cycle_year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.manager)),
):
    """Goal distribution by Thrust Area, UoM type, and status."""
    # By Thrust Area
    thrust_data = {}
    goals = db.query(models.Goal).join(models.GoalSheet).filter(
        models.GoalSheet.cycle_year == cycle_year
    ).options(joinedload(models.Goal.thrust_area)).all()

    total_goals = len(goals)
    for goal in goals:
        ta = goal.thrust_area.name if goal.thrust_area else "Unknown"
        thrust_data[ta] = thrust_data.get(ta, 0) + 1

    by_thrust = [
        {"label": k, "count": v, "percentage": round(v / total_goals * 100, 1) if total_goals else 0}
        for k, v in sorted(thrust_data.items(), key=lambda x: -x[1])
    ]

    # By UoM type
    uom_data = {}
    for goal in goals:
        uom_data[goal.uom_type] = uom_data.get(goal.uom_type, 0) + 1
    by_uom = [
        {"label": k, "count": v, "percentage": round(v / total_goals * 100, 1) if total_goals else 0}
        for k, v in uom_data.items()
    ]

    # By status (from achievements in latest quarter available)
    status_data = {}
    achievements = db.query(models.Achievement).join(models.Goal).join(models.GoalSheet).filter(
        models.GoalSheet.cycle_year == cycle_year
    ).all()
    for a in achievements:
        status_data[a.status] = status_data.get(a.status, 0) + 1
    total_ach = sum(status_data.values()) or 1
    by_status = [
        {"label": k, "count": v, "percentage": round(v / total_ach * 100, 1)}
        for k, v in status_data.items()
    ]

    return {
        "by_thrust_area": by_thrust,
        "by_uom_type": by_uom,
        "by_status": by_status,
        "total_goals": total_goals,
    }


@router.get("/manager-effectiveness")
def manager_effectiveness(
    cycle_year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin)),
):
    """Manager effectiveness dashboard — check-in completion rates."""
    managers = db.query(models.User).filter(models.User.role == models.UserRole.manager).all()
    result = []
    for mgr in managers:
        reportee_ids = [u.id for u in mgr.reportees]
        if not reportee_ids:
            continue
        # Sheets of team members this year
        sheets = db.query(models.GoalSheet).filter(
            models.GoalSheet.employee_id.in_(reportee_ids),
            models.GoalSheet.cycle_year == cycle_year,
        ).all()
        total_possible = len(sheets) * 4  # 4 quarters
        checkins_done = db.query(models.CheckIn).filter(
            models.CheckIn.manager_id == mgr.id,
            models.CheckIn.cycle_year == cycle_year,
        ).count()
        completion_rate = round(checkins_done / total_possible * 100, 1) if total_possible > 0 else 0
        result.append({
            "manager_id": mgr.id,
            "manager_name": mgr.name,
            "department": mgr.department.name if mgr.department else "N/A",
            "total_team": len(reportee_ids),
            "total_sheets": len(sheets),
            "checkins_done": checkins_done,
            "max_possible_checkins": total_possible,
            "completion_rate": completion_rate,
        })
    return sorted(result, key=lambda x: -x["completion_rate"])


@router.get("/individual-summary")
def individual_summary(
    employee_id: int = Query(...),
    cycle_year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.manager)),
):
    """Individual employee goal summary across quarters."""
    sheet = db.query(models.GoalSheet).options(
        joinedload(models.GoalSheet.goals).joinedload(models.Goal.achievements),
        joinedload(models.GoalSheet.employee),
    ).filter(
        models.GoalSheet.employee_id == employee_id,
        models.GoalSheet.cycle_year == cycle_year,
    ).first()

    if not sheet:
        return {"error": "No goal sheet found"}

    summary = []
    for goal in sheet.goals:
        goal_data = {
            "goal_title": goal.title,
            "weightage": goal.weightage,
            "target": goal.target_value,
            "quarters": {}
        }
        for ach in goal.achievements:
            goal_data["quarters"][ach.quarter] = {
                "actual": ach.actual_value,
                "status": ach.status,
                "progress_score": round(ach.progress_score * 100, 1) if ach.progress_score else None,
            }
        summary.append(goal_data)

    return {
        "employee": sheet.employee.name if sheet.employee else "N/A",
        "cycle_year": cycle_year,
        "sheet_status": sheet.status,
        "goals": summary,
    }
