from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, SessionLocal
import models
from auth import hash_password
from routers import auth, users, goals, reports, analytics

app = FastAPI(title="AtomQuest Goal Tracking Portal", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://atomquesthackathon-production.up.railway.app", "https://caring-recreation-production.up.railway.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(goals.router, prefix="/goals", tags=["goals"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    _seed_data()


def _seed_data():
    db = SessionLocal()
    try:
        # Skip if already seeded
        if db.query(models.User).first():
            return

        # Departments
        depts = [
            models.Department(name="Engineering"),
            models.Department(name="Sales"),
            models.Department(name="Human Resources"),
            models.Department(name="Operations"),
        ]
        db.add_all(depts)
        db.flush()

        # Thrust Areas
        thrust_areas = [
            models.ThrustArea(name="Revenue Growth", description="Initiatives to increase revenue"),
            models.ThrustArea(name="Customer Experience", description="Improving customer satisfaction"),
            models.ThrustArea(name="Operational Excellence", description="Process efficiency and quality"),
            models.ThrustArea(name="People Development", description="Team growth and capability building"),
            models.ThrustArea(name="Innovation", description="New products and technology initiatives"),
            models.ThrustArea(name="Risk & Compliance", description="Safety, security, and regulatory compliance"),
        ]
        db.add_all(thrust_areas)
        db.flush()

        # Admin user
        admin = models.User(
            name="Admin User",
            email="admin@atomquest.com",
            hashed_password=hash_password("Admin@123"),
            role=models.UserRole.admin,
            department_id=depts[2].id,
        )
        db.add(admin)
        db.flush()

        # Manager
        manager = models.User(
            name="Priya Sharma",
            email="manager@atomquest.com",
            hashed_password=hash_password("Manager@123"),
            role=models.UserRole.manager,
            department_id=depts[0].id,
        )
        db.add(manager)
        db.flush()

        # Employees
        emp1 = models.User(
            name="Rahul Verma",
            email="employee@atomquest.com",
            hashed_password=hash_password("Employee@123"),
            role=models.UserRole.employee,
            department_id=depts[0].id,
            manager_id=manager.id,
        )
        emp2 = models.User(
            name="Anjali Singh",
            email="anjali@atomquest.com",
            hashed_password=hash_password("Employee@123"),
            role=models.UserRole.employee,
            department_id=depts[0].id,
            manager_id=manager.id,
        )
        db.add_all([emp1, emp2])
        db.commit()

        print("✅ Seed data created successfully")
        print("   admin@atomquest.com / Admin@123")
        print("   manager@atomquest.com / Manager@123")
        print("   employee@atomquest.com / Employee@123")
    except Exception as e:
        db.rollback()
        print(f"Seed error (may already exist): {e}")
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "AtomQuest Goal Tracking Portal API", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
