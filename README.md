# ⚛ AtomQuest — Goal Setting & Tracking Portal

A full-stack web portal for employee goal setting, approval workflows, quarterly achievement tracking, and analytics.

---

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Frontend   | React + Vite            |
| Styling    | Tailwind CSS            |
| Backend    | FastAPI                 |
| Database   | MySQL                   |
| ORM        | SQLAlchemy              |
| Auth       | JWT (python-jose)       |
| Charts     | Recharts                |

---

## Project Structure

```
atomquest/
├── backend/               # FastAPI application
│   ├── main.py            # App entry point + seed data
│   ├── models.py          # SQLAlchemy ORM models
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── database.py        # DB engine + session
│   ├── auth.py            # JWT + password hashing
│   ├── config.py          # Settings (reads .env)
│   ├── audit.py           # Audit log utility
│   ├── progress.py        # Progress score calculator
│   ├── requirements.txt
│   ├── .env.example
│   └── routers/
│       ├── auth.py        # Login, /me
│       ├── users.py       # Users, departments, thrust areas
│       ├── goals.py       # Goal sheets, goals, achievements, check-ins
│       ├── reports.py     # CSV/Excel export, completion dashboard
│       └── analytics.py   # Section 5.4 — QoQ, heatmap, distribution, manager effectiveness
│
└── frontend/              # React + Vite application
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx         # Router + protected routes
    │   ├── index.css       # Tailwind + component classes
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── utils/
    │   │   ├── api.js      # Axios instance with JWT interceptor
    │   │   └── helpers.js  # Formatters, constants
    │   ├── components/
    │   │   ├── Layout.jsx  # Sidebar navigation
    │   │   └── UI.jsx      # Badge, Modal, Spinner, ProgressBar, StatCard
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── MyGoals.jsx       # Employee: create goals, log achievements
    │       ├── Achievements.jsx  # Employee: quarter-wise achievement view
    │       ├── TeamGoals.jsx     # Manager/Admin: approve, return, share goals
    │       ├── Checkins.jsx      # Manager: quarterly check-ins
    │       ├── Reports.jsx       # Completion dashboard, achievement report, export
    │       ├── Analytics.jsx     # 5.4 bonus — QoQ, heatmap, distribution, manager effectiveness
    │       ├── Users.jsx         # Admin: manage users, departments, thrust areas
    │       └── AuditLogs.jsx     # Admin: full audit trail
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── index.html
```

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **MySQL 8.0+** running locally

---

## Setup

### 1. Database

```sql
CREATE DATABASE atomquest CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and SECRET_KEY

# Start server (tables + seed data created automatically on startup)
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

---

## Demo Credentials

| Role     | Email                        | Password      |
|----------|------------------------------|---------------|
| Admin    | admin@atomquest.com          | Admin@123     |
| Manager  | manager@atomquest.com        | Manager@123   |
| Employee | employee@atomquest.com       | Employee@123  |

---

## Features Implemented

### Phase 1 — Goal Creation & Approval
- Employee creates goal sheet per cycle year
- Goals with Thrust Area, UoM type, Target, Weightage
- Validation: total weightage = 100%, min 10% per goal, max 8 goals
- Manager (L1) approval with inline edit capability
- Return for rework with mandatory comment
- Shared Goals — manager pushes departmental KPI to multiple employees; recipients adjust weightage only
- Goals locked after approval; all post-lock edits logged to audit trail

### Phase 2 — Achievement Tracking & Check-ins
- Quarterly achievement logging (Q1–Q4) with status: Not Started / On Track / Completed
- Auto-computed progress scores per UoM type:
  - Numeric Min: achievement ÷ target
  - Numeric Max: target ÷ achievement
  - Timeline: completion date vs. deadline
  - Zero-based: 0 = 100%, else 0%
- Shared goal achievements sync to primary owner
- Manager quarterly check-in with structured comment

### Reporting & Governance
- Completion Dashboard — per-employee check-in status across all quarters
- Achievement Report — planned vs. actual with progress scores
- Export to CSV and Excel
- Audit Trail — all actions logged with user, timestamp, entity, and diff

### Section 5.4 — Analytics Module (Bonus)
- **QoQ Trends** — line + bar charts showing avg achievement score and goal completion counts per quarter
- **Completion Heatmap** — colour-coded table by department or manager across quarters
- **Goal Distribution** — pie/bar charts by Thrust Area, UoM type, and status
- **Manager Effectiveness** — leaderboard + bar chart of check-in completion rates across L1 managers

---

## Environment Variables

```env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/atomquest
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```
