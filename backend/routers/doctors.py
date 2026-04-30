from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from backend.database import get_db, User, DoctorProfile, Appointment
from backend.auth import get_current_user

router = APIRouter(prefix="/doctors", tags=["Doctors"])

class DoctorProfileUpdate(BaseModel):
    specialty: Optional[str] = None
    experience: Optional[str] = None
    hospital: Optional[str] = None
    fee: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

@router.get("/", summary="Get list of all doctors")
def get_all_doctors(db: Session = Depends(get_db)):
    doctors = db.query(User).filter(User.role == "doctor").all()
    results = []
    for doc in doctors:
        profile = doc.doctor_profile
        results.append({
            "id": f"doc-{doc.id}",
            "db_id": doc.id,
            "name": doc.full_name,
            "email": doc.email,
            "title": profile.specialty if profile else "General Physician",
            "specialty": profile.specialty if profile else "General",
            "exp": profile.experience if profile else "0 yrs",
            "experience": profile.experience if profile else "0 yrs",
            "hospital": profile.hospital if profile else "MediAI Clinic",
            "fee": profile.fee if profile else "\u20b90",
            "avatar": profile.avatar_url if profile and profile.avatar_url else doc.full_name[0],
            "avatar_url": profile.avatar_url if profile else None,
            "bio": profile.bio if profile else "",
            "rating": 4.8,
            "reviews": 120,
            "available": True
        })
    return results

@router.get("/me", summary="Get my doctor profile")
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Not a doctor")
    profile = current_user.doctor_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "id": current_user.id,
        "name": current_user.full_name,
        "email": current_user.email,
        "specialty": profile.specialty,
        "experience": profile.experience,
        "hospital": profile.hospital,
        "fee": profile.fee,
        "avatar_url": profile.avatar_url,
        "bio": profile.bio
    }

@router.put("/profile", summary="Update doctor profile")
def update_profile(req: DoctorProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Not a doctor")
    
    profile = current_user.doctor_profile
    if not profile:
        profile = DoctorProfile(user_id=current_user.id)
        db.add(profile)
        
    if req.specialty is not None: profile.specialty = req.specialty
    if req.experience is not None: profile.experience = req.experience
    if req.hospital is not None: profile.hospital = req.hospital
    if req.fee is not None: profile.fee = req.fee
    if req.avatar_url is not None: profile.avatar_url = req.avatar_url
    if req.bio is not None: profile.bio = req.bio
    
    db.commit()
    return {"status": "success", "message": "Profile updated"}
