from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database import get_db, User
from backend.auth import get_current_user

router = APIRouter(prefix="/patients", tags=["Patients"])


class ProfileUpdate(BaseModel):
    full_name:   str | None = None
    age:         int | None = None
    gender:      str | None = None
    blood_type:  str | None = None
    allergies:   str | None = None
    medications: str | None = None


@router.get("/me", summary="Get current patient profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id":          current_user.id,
        "email":       current_user.email,
        "full_name":   current_user.full_name,
        "age":         current_user.age,
        "gender":      current_user.gender,
        "blood_type":  current_user.blood_type,
        "allergies":   current_user.allergies,
        "medications": current_user.medications,
        "role":        current_user.role,
        "member_since":current_user.created_at.isoformat(),
    }


@router.put("/me", summary="Update patient profile")
def update_profile(
    updates: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in updates.dict(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated.", "profile": updates.dict(exclude_none=True)}
