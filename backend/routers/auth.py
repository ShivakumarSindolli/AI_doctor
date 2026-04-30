from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from backend.database import get_db, User, DoctorProfile
from backend.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    email:     EmailStr
    full_name: str
    password:  str
    age:       int   | None = None
    gender:    str   | None = None
    blood_type:str   | None = None
    allergies: str   | None = None
    medications:str  | None = None
    role:      str   | None = "patient"


@router.post("/register", summary="Create a new account (patient or doctor)")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if req.role == "doctor" and not req.email.endswith("@doctor.com"):
        raise HTTPException(status_code=400, detail="Doctor registration requires an @doctor.com email address.")
        
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
        
    user = User(
        email=req.email,
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        age=req.age,
        gender=req.gender,
        blood_type=req.blood_type,
        allergies=req.allergies,
        medications=req.medications,
        role=req.role or "patient",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    if user.role == "doctor":
        doc_profile = DoctorProfile(
            user_id=user.id,
            specialty="General",
            experience="0 yrs",
            hospital="MediAI Clinic",
            fee="₹0"
        )
        db.add(doc_profile)
        db.commit()
        
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id, "role": user.role}


@router.post("/login", summary="Login and receive JWT token")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "role": user.role}
