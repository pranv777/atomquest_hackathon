from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import datetime
from models import UserRole, GoalStatus, AchievementStatus, UoMType, QuarterPeriod


# ── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"

class TokenData(BaseModel):
    user_id: Optional[int] = None


# ── Department ────────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


# ── User ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.employee
    department_id: Optional[int] = None
    manager_id: Optional[int] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: bool
    department: Optional[DepartmentOut] = None
    model_config = {"from_attributes": True}

class UserWithManager(UserOut):
    manager: Optional[UserOut] = None
    model_config = {"from_attributes": True}


# ── ThrustArea ────────────────────────────────────────────────────────────────

class ThrustAreaCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ThrustAreaOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Goal ──────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    thrust_area_id: int
    title: str
    description: Optional[str] = None
    uom_type: UoMType
    target_value: Optional[float] = None
    target_date: Optional[datetime] = None
    weightage: float

    @field_validator("weightage")
    @classmethod
    def check_weightage(cls, v):
        if v < 10:
            raise ValueError("Minimum weightage per goal is 10%")
        if v > 100:
            raise ValueError("Maximum weightage per goal is 100%")
        return v

class GoalUpdate(BaseModel):
    thrust_area_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    uom_type: Optional[UoMType] = None
    target_value: Optional[float] = None
    target_date: Optional[datetime] = None
    weightage: Optional[float] = None

class GoalOut(BaseModel):
    id: int
    goal_sheet_id: int
    thrust_area_id: int
    title: str
    description: Optional[str] = None
    uom_type: UoMType
    target_value: Optional[float] = None
    target_date: Optional[datetime] = None
    weightage: float
    is_shared: bool
    is_read_only: bool
    shared_from_goal_id: Optional[int] = None
    thrust_area: Optional[ThrustAreaOut] = None
    achievements: List["AchievementOut"] = []
    model_config = {"from_attributes": True}


# ── GoalSheet ─────────────────────────────────────────────────────────────────

class GoalSheetCreate(BaseModel):
    cycle_year: int

class GoalSheetOut(BaseModel):
    id: int
    employee_id: int
    manager_id: Optional[int] = None
    cycle_year: int
    status: GoalStatus
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    manager_comment: Optional[str] = None
    created_at: datetime
    employee: Optional[UserOut] = None
    manager: Optional[UserOut] = None
    goals: List[GoalOut] = []
    model_config = {"from_attributes": True}


# ── Achievement ───────────────────────────────────────────────────────────────

class AchievementCreate(BaseModel):
    quarter: QuarterPeriod
    cycle_year: int
    actual_value: Optional[float] = None
    actual_date: Optional[datetime] = None
    status: AchievementStatus = AchievementStatus.not_started
    notes: Optional[str] = None

class AchievementOut(BaseModel):
    id: int
    goal_id: int
    quarter: QuarterPeriod
    cycle_year: int
    actual_value: Optional[float] = None
    actual_date: Optional[datetime] = None
    status: AchievementStatus
    progress_score: Optional[float] = None
    notes: Optional[str] = None
    model_config = {"from_attributes": True}


# ── CheckIn ───────────────────────────────────────────────────────────────────

class CheckInCreate(BaseModel):
    quarter: QuarterPeriod
    cycle_year: int
    comment: Optional[str] = None

class CheckInOut(BaseModel):
    id: int
    goal_sheet_id: int
    manager_id: int
    quarter: QuarterPeriod
    cycle_year: int
    comment: Optional[str] = None
    created_at: datetime
    manager: Optional[UserOut] = None
    model_config = {"from_attributes": True}


# ── SharedGoal ────────────────────────────────────────────────────────────────

class SharedGoalCreate(BaseModel):
    goal_id: int
    employee_ids: List[int]

class SharedGoalWeightageUpdate(BaseModel):
    weightage: float

    @field_validator("weightage")
    @classmethod
    def check_weightage(cls, v):
        if v < 10:
            raise ValueError("Minimum weightage is 10%")
        return v


# ── Audit ─────────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    description: Optional[str] = None
    created_at: datetime
    user: Optional[UserOut] = None
    model_config = {"from_attributes": True}


# ── Analytics ─────────────────────────────────────────────────────────────────

class QoQTrendData(BaseModel):
    quarter: str
    avg_score: float
    completed: int
    total: int

class HeatmapData(BaseModel):
    name: str
    q1: float
    q2: float
    q3: float
    q4: float

class DistributionData(BaseModel):
    label: str
    count: int
    percentage: float

class ManagerEffectivenessData(BaseModel):
    manager_name: str
    total_team: int
    checkins_done: int
    completion_rate: float


# Update forward refs
Token.model_rebuild()
GoalOut.model_rebuild()
GoalSheetOut.model_rebuild()
