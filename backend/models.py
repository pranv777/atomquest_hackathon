from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class UserRole(str, enum.Enum):
    employee = "employee"
    manager = "manager"
    admin = "admin"


class GoalStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    returned = "returned"


class AchievementStatus(str, enum.Enum):
    not_started = "not_started"
    on_track = "on_track"
    completed = "completed"


class UoMType(str, enum.Enum):
    numeric_min = "numeric_min"   # higher is better
    numeric_max = "numeric_max"   # lower is better
    timeline = "timeline"
    zero = "zero"


class QuarterPeriod(str, enum.Enum):
    q1 = "q1"
    q2 = "q2"
    q3 = "q3"
    q4 = "q4"


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="department")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.employee)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    department = relationship("Department", back_populates="users")
    manager = relationship("User", remote_side=[id], back_populates="reportees")
    reportees = relationship("User", back_populates="manager")
    goal_sheets = relationship("GoalSheet", back_populates="employee", foreign_keys="GoalSheet.employee_id")
    managed_sheets = relationship("GoalSheet", back_populates="manager", foreign_keys="GoalSheet.manager_id")


class ThrustArea(Base):
    __tablename__ = "thrust_areas"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    goals = relationship("Goal", back_populates="thrust_area")


class GoalSheet(Base):
    __tablename__ = "goal_sheets"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cycle_year = Column(Integer, nullable=False)
    status = Column(Enum(GoalStatus), default=GoalStatus.draft)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    manager_comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee = relationship("User", back_populates="goal_sheets", foreign_keys=[employee_id])
    manager = relationship("User", back_populates="managed_sheets", foreign_keys=[manager_id])
    goals = relationship("Goal", back_populates="goal_sheet", cascade="all, delete-orphan")
    checkins = relationship("CheckIn", back_populates="goal_sheet", cascade="all, delete-orphan")


class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    goal_sheet_id = Column(Integer, ForeignKey("goal_sheets.id"), nullable=False)
    thrust_area_id = Column(Integer, ForeignKey("thrust_areas.id"), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    uom_type = Column(Enum(UoMType), nullable=False)
    target_value = Column(Float, nullable=True)
    target_date = Column(DateTime(timezone=True), nullable=True)
    weightage = Column(Float, nullable=False)
    is_shared = Column(Boolean, default=False)
    shared_from_goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    is_read_only = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    goal_sheet = relationship("GoalSheet", back_populates="goals")
    thrust_area = relationship("ThrustArea", back_populates="goals")
    achievements = relationship("Achievement", back_populates="goal", cascade="all, delete-orphan")
    shared_copies = relationship("Goal", foreign_keys=[shared_from_goal_id])
    parent_goal = relationship("Goal", remote_side=[id], foreign_keys=[shared_from_goal_id])


class Achievement(Base):
    __tablename__ = "achievements"
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    quarter = Column(Enum(QuarterPeriod), nullable=False)
    cycle_year = Column(Integer, nullable=False)
    actual_value = Column(Float, nullable=True)
    actual_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(AchievementStatus), default=AchievementStatus.not_started)
    progress_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    goal = relationship("Goal", back_populates="achievements")


class CheckIn(Base):
    __tablename__ = "checkins"
    id = Column(Integer, primary_key=True, index=True)
    goal_sheet_id = Column(Integer, ForeignKey("goal_sheets.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quarter = Column(Enum(QuarterPeriod), nullable=False)
    cycle_year = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    goal_sheet = relationship("GoalSheet", back_populates="checkins")
    manager = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
