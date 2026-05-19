from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models, schemas
from auth import verify_password, create_access_token, get_current_user, hash_password

router = APIRouter(tags=["auth"])

# Request schema for login
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login", response_model=schemas.Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password - expects JSON"""
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    token = create_access_token({"sub": str(user.id)})
    
    user_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "department_id": user.department_id,
        "manager_id": user.manager_id,
        "is_active": user.is_active,
        "department": {
            "id": user.department.id,
            "name": user.department.name
        } if user.department else None
    }
    
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": user_data
    }

@router.get("/me", response_model=schemas.UserWithManager)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    data: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    old_pwd = data.get("old_password")
    new_pwd = data.get("new_password")
    if not verify_password(old_pwd, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    current_user.hashed_password = hash_password(new_pwd)
    db.commit()
    return {"message": "Password changed successfully"}
