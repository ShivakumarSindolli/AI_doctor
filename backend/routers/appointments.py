from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from backend.database import get_db, User, Appointment
from backend.auth import get_current_user

router = APIRouter(prefix="/appointments", tags=["Appointments"])

class AppointmentCreate(BaseModel):
    doctor_id: int
    date: str
    time: str
    notes: Optional[str] = None

@router.post("/", summary="Book an appointment")
def book_appointment(req: AppointmentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
        
    doctor = db.query(User).filter(User.id == req.doctor_id, User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    apt = Appointment(
        patient_id=current_user.id,
        doctor_id=doctor.id,
        date=req.date,
        time=req.time,
        notes=req.notes
    )
    db.add(apt)
    db.commit()
    db.refresh(apt)
    return {"status": "success", "appointment_id": apt.id}

@router.get("/me", summary="Get my appointments")
def get_my_appointments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "doctor":
        apts = db.query(Appointment).filter(Appointment.doctor_id == current_user.id).order_by(Appointment.created_at.desc()).all()
        results = []
        for a in apts:
            results.append({
                "id": a.id,
                "date": a.date,
                "time": a.time,
                "status": a.status,
                "notes": a.notes,
                "other_party_name": a.patient.full_name,
                "other_party_email": a.patient.email,
                "role": "doctor"
            })
        return results
    else:
        apts = db.query(Appointment).filter(Appointment.patient_id == current_user.id).order_by(Appointment.created_at.desc()).all()
        results = []
        for a in apts:
            results.append({
                "id": a.id,
                "date": a.date,
                "time": a.time,
                "status": a.status,
                "notes": a.notes,
                "other_party_name": a.doctor.full_name,
                "other_party_email": a.doctor.email,
                "role": "patient"
            })
        return results

class StatusUpdate(BaseModel):
    status: str

@router.put("/{appointment_id}/status", summary="Update appointment status")
def update_status(appointment_id: int, req: StatusUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update appointment status")
        
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if apt.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this appointment")
        
    if req.status not in ["accepted", "rejected", "completed", "scheduled", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    apt.status = req.status
    db.commit()
    db.refresh(apt)
    return {"status": "success", "appointment_id": apt.id, "new_status": apt.status}
