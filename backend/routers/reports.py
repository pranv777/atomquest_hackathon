from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional
import io, csv
from openpyxl import Workbook
from database import get_db
import models
from auth import get_current_user, require_role

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/completion-dashboard")
def completion_dashboard(
    cycle_year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.manager)),
):
    sheets = db.query(models.GoalSheet).options(
        joinedload(models.GoalSheet.employee),
        joinedload(models.GoalSheet.checkins),
    ).filter(models.GoalSheet.cycle_year == cycle_year).all()

    quarters = ["q1", "q2", "q3", "q4"]
    result = []
    for sheet in sheets:
        completed_quarters = {c.quarter for c in sheet.checkins}
        result.append({
            "employee_id": sheet.employee_id,
            "employee_name": sheet.employee.name if sheet.employee else "N/A",
            "sheet_status": sheet.status,
            "submitted_at": sheet.submitted_at.isoformat() if sheet.submitted_at else None,
            "approved_at": sheet.approved_at.isoformat() if sheet.approved_at else None,
            "checkins": {q: q in completed_quarters for q in quarters},
        })
    return result


@router.get("/achievement")
def achievement_report(
    cycle_year: int = Query(...),
    quarter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.manager)),
):
    sheets = db.query(models.GoalSheet).options(
        joinedload(models.GoalSheet.employee),
        joinedload(models.GoalSheet.goals).joinedload(models.Goal.thrust_area),
        joinedload(models.GoalSheet.goals).joinedload(models.Goal.achievements),
    ).filter(models.GoalSheet.cycle_year == cycle_year).all()

    rows = []
    for sheet in sheets:
        for goal in sheet.goals:
            for ach in goal.achievements:
                if quarter and ach.quarter != quarter:
                    continue
                rows.append({
                    "employee_id": sheet.employee_id,
                    "employee_name": sheet.employee.name if sheet.employee else "N/A",
                    "goal_title": goal.title,
                    "thrust_area": goal.thrust_area.name if goal.thrust_area else "N/A",
                    "uom_type": goal.uom_type,
                    "weightage": goal.weightage,
                    "target": goal.target_value,
                    "quarter": ach.quarter,
                    "actual": ach.actual_value,
                    "status": ach.status,
                    "progress_score": round(ach.progress_score * 100, 1) if ach.progress_score else None,
                })
    return rows


@router.get("/export/csv")
def export_csv(
    cycle_year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.manager)),
):
    rows = achievement_report(cycle_year=cycle_year, quarter=None, db=db, current_user=current_user)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys() if rows else [
        "employee_id","employee_name","goal_title","thrust_area","uom_type",
        "weightage","target","quarter","actual","status","progress_score"
    ])
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=achievement_{cycle_year}.csv"},
    )


@router.get("/export/excel")
def export_excel(
    cycle_year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.manager)),
):
    rows = achievement_report(cycle_year=cycle_year, quarter=None, db=db, current_user=current_user)

    wb = Workbook()
    ws = wb.active
    ws.title = "Achievement Report"

    headers = [
        "Employee ID", "Employee Name", "Goal Title", "Thrust Area", "UoM Type",
        "Weightage (%)", "Target", "Quarter", "Actual", "Status", "Progress Score (%)"
    ]
    ws.append(headers)

    for row in rows:
        ws.append(list(row.values()))

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        iter([output.read()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=achievement_{cycle_year}.xlsx"},
    )


@router.get("/audit-logs")
def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.admin)),
):
    q = db.query(models.AuditLog).options(joinedload(models.AuditLog.user))
    if entity_type:
        q = q.filter(models.AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(models.AuditLog.entity_id == entity_id)
    return q.order_by(models.AuditLog.created_at.desc()).limit(limit).all()
