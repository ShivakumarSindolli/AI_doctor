import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db, Consultation, User
from backend.auth import get_current_user

router = APIRouter(prefix="/history", tags=["History"])


@router.get("/", summary="Get consultation history")
def get_history(
    limit:        int = Query(10, ge=1, le=50),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    records = (
        db.query(Consultation)
        .filter(Consultation.user_id == current_user.id)
        .order_by(Consultation.created_at.desc())
        .limit(limit)
        .all()
    )
    results = []
    for r in records:
        diagnosis = {}
        if r.diagnosis:
            try:
                diagnosis = json.loads(r.diagnosis)
            except Exception:
                diagnosis = {"raw": r.diagnosis}
        results.append({
            "id":             r.id,
            "session_id":     r.session_id,
            "date":           r.created_at.isoformat(),
            "patient_text":   r.patient_text,
            "specialist":     r.specialist,
            "diagnosis":      diagnosis,
            "doctor_response":r.doctor_response,
            "confidence":     r.confidence,
            "icd_codes":      r.icd_codes,
            "flagged":        r.flagged,
        })
    return {"consultations": results, "total": len(results)}


@router.delete("/{consultation_id}", summary="Delete a consultation record")
def delete_record(
    consultation_id: int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    record = (
        db.query(Consultation)
        .filter(Consultation.id == consultation_id, Consultation.user_id == current_user.id)
        .first()
    )
    if not record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Record not found.")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted."}
