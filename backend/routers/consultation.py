import uuid
import json
import os
import shutil
import logging
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db, Consultation, User
from backend.auth import get_current_user
from backend.services.stt_service import transcribe_audio
from backend.services.vision_service import analyze_image
from backend.services.rag_service import retrieve_context, rag_query
from backend.services.memory_service import get_history, save_turn
from backend.services.safety_service import apply_safety_layer, score_confidence, check_emergency
from backend.services.tts_service import text_to_speech
from backend.services.translation_service import translate_to_english, translate_from_english
from backend.agents.triage_agent import triage
from backend.agents.diagnosis_agent import diagnose
from backend.agents.specialist_agents import generate_specialist_response

logger   = logging.getLogger(__name__)
router   = APIRouter(prefix="/consult", tags=["Consultation"])
UPLOAD_DIR = "./backend/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── MIME type → file extension ────────────────────────────────────────────────
# Browser MediaRecorder sends one of these MIME types.
# We must save with the matching extension so stt_service can detect the format.
AUDIO_MIME_TO_EXT = {
    "audio/webm": ".webm",
    "audio/webm;codecs=opus": ".webm",
    "audio/webm;codecs=vp8": ".webm",
    "audio/ogg": ".ogg",
    "audio/ogg;codecs=opus": ".ogg",
    "audio/mp4": ".mp4",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/flac": ".flac",
}


def _safe_audio_extension(upload: UploadFile, default_ext: str = ".webm") -> str:
    """
    Determine the correct file extension for a saved audio file.
    """
    # 1. Content-type header (most reliable — set by browser MediaRecorder)
    ct = (upload.content_type or "").strip().lower()
    if ct in AUDIO_MIME_TO_EXT:
        ext = AUDIO_MIME_TO_EXT[ct]
        logger.info(f"[CONSULT] Audio extension from content-type '{ct}': {ext}")
        return ext

    # Try base content-type (strip ;codecs=... params)
    ct_base = ct.split(";")[0].strip()
    if ct_base in AUDIO_MIME_TO_EXT:
        ext = AUDIO_MIME_TO_EXT[ct_base]
        logger.info(f"[CONSULT] Audio extension from base content-type '{ct_base}': {ext}")
        return ext

    # 2. Filename extension (sent by some clients)
    if upload.filename:
        name_ext = os.path.splitext(upload.filename)[1].lower()
        if name_ext in {".webm", ".ogg", ".mp4", ".mp3", ".wav", ".flac", ".m4a"}:
            logger.info(f"[CONSULT] Audio extension from filename '{upload.filename}': {name_ext}")
            return name_ext

    # 3. Fallback
    logger.warning(f"[CONSULT] Could not detect audio format, using default: {default_ext}")
    return default_ext


def _safe_extension(filename: str | None, default_ext: str) -> str:
    """Original helper — kept for image files."""
    ext = os.path.splitext(filename or "")[1].lower()
    return ext if ext else default_ext


def _public_audio_url(audio_path: str) -> str:
    return f"/audio/{os.path.basename(audio_path)}"


@router.post("/", summary="Full AI doctor consultation pipeline")
async def consult(
    audio:       UploadFile  = File(...),
    image:       UploadFile  = File(None),
    session_id:  str         = Form(None),
    language:    str         = Form("en"),
    db:          Session     = Depends(get_db),
    current_user:User        = Depends(get_current_user),
):
    # ── Session ID ─────────────────────────────────────────────────────────────
    if not session_id:
        session_id = str(uuid.uuid4())

    # ── Validate language ──────────────────────────────────────────────────────
    from backend.config import SUPPORTED_LANGUAGES
    if language not in SUPPORTED_LANGUAGES:
        language = "en"
    logger.info(f"[CONSULT] Language: {language} ({SUPPORTED_LANGUAGES[language]['name']})")

    # ── Save uploaded audio WITH correct extension ─────────────────────────────
    audio_ext  = _safe_audio_extension(audio, default_ext=".webm")
    audio_path = os.path.join(UPLOAD_DIR, f"{session_id}_audio{audio_ext}")

    with open(audio_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    # Validate saved file is not empty
    audio_size = os.path.getsize(audio_path)
    if audio_size == 0:
        raise HTTPException(
            status_code=400,
            detail="Audio file is empty. Please record for at least 1–2 seconds and try again."
        )

    logger.info(
        f"[CONSULT] Audio saved: {audio_path} "
        f"({audio_size / 1024:.1f} KB | ext={audio_ext} | "
        f"content_type={audio.content_type!r})"
    )

    # ── Save uploaded image (optional) ────────────────────────────────────────
    image_path = None
    if image and image.filename:
        image_ext  = _safe_extension(image.filename, ".jpg")
        image_path = os.path.join(UPLOAD_DIR, f"{session_id}_image{image_ext}")
        with open(image_path, "wb") as f:
            shutil.copyfileobj(image.file, f)

    # ── Step 1: STT (multilingual) ────────────────────────────────────────────
    try:
        stt_result = transcribe_audio(audio_path, language=language)
        patient_text_original = stt_result["text"]
        detected_language = stt_result.get("language", language)
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[CONSULT] STT error: {error_msg}")
        raise HTTPException(
            status_code=422,
            detail=(
                f"Audio transcription failed. Please try again with a clearer recording. "
                f"Error: {error_msg}"
            )
        )

    if not patient_text_original:
        raise HTTPException(
            status_code=422,
            detail="Could not transcribe audio. Please ensure the recording contains speech."
        )

    # ── Step 1b: Translate to English (if not English) ─────────────────────────
    is_english = detected_language.startswith("en")
    if is_english:
        patient_text = patient_text_original
    else:
        try:
            patient_text = translate_to_english(patient_text_original, detected_language)
            logger.info(f"[CONSULT] Translated to English: {patient_text[:80]}...")
        except Exception as e:
            logger.error(f"[CONSULT] Translation to English failed: {e}")
            patient_text = patient_text_original  # fallback: use original

    # ── Step 2: Emergency check (fast path) ───────────────────────────────────
    if check_emergency(patient_text):
        response_text = (
            "This sounds like a medical emergency. Please call emergency services "
            "(112 or your local emergency number) immediately or go to the nearest emergency room."
        )
        # Translate emergency response if needed
        if not is_english:
            try:
                response_text = translate_from_english(response_text, detected_language)
            except Exception:
                pass
        try:
            audio_out = text_to_speech(response_text, language=detected_language)
        except Exception as e:
            logger.error(f"[CONSULT] TTS error: {e}")
            audio_out = None

        return {
            "session_id":      session_id,
            "patient_text":    patient_text_original,
            "patient_text_en": patient_text,
            "specialist":      "emergency",
            "urgency":         "emergency",
            "diagnosis":       {},
            "doctor_response": response_text,
            "confidence":      1.0,
            "icd_codes":       [],
            "flagged":         True,
            "language":        detected_language,
            "audio_path":      audio_out,
            "audio_url":       _public_audio_url(audio_out) if audio_out else None,
        }

    # ── Step 3: Vision ─────────────────────────────────────────────────────────
    vision_findings = None
    if image_path:
        try:
            vision_findings = analyze_image(image_path)
            logger.info(f"[CONSULT] Vision: {vision_findings.get('severity', 'unknown')}")
        except Exception as e:
            logger.error(f"[CONSULT] Vision error (continuing): {e}")
            vision_findings = None

    # ── Step 4: Triage (uses English text) ─────────────────────────────────────
    try:
        triage_result = triage(patient_text, vision_findings)
        specialty     = triage_result.get("specialty", "general")
        urgency       = triage_result.get("urgency", "routine")
        icd_hints     = triage_result.get("icd_hints", [])
    except Exception as e:
        logger.error(f"[CONSULT] Triage error: {e}")
        specialty, urgency, icd_hints = "general", "routine", []
        triage_result = {"specialty": specialty, "urgency": urgency, "icd_hints": icd_hints}

    # ── Step 5: RAG ────────────────────────────────────────────────────────────
    try:
        rag_context = retrieve_context(patient_text)
    except Exception as e:
        logger.warning(f"[CONSULT] RAG error (continuing): {e}")
        rag_context = ""

    # ── Step 6: Conversation history ──────────────────────────────────────────
    try:
        history = get_history(session_id, db)
    except Exception as e:
        logger.warning(f"[CONSULT] History error: {e}")
        history = []

    # ── Step 7: Structured diagnosis (uses English text) ──────────────────────
    try:
        patient_profile = (
            f"Name: {current_user.full_name}, Age: {current_user.age}, "
            f"Gender: {current_user.gender}, Blood type: {current_user.blood_type}, "
            f"Allergies: {current_user.allergies}, Medications: {current_user.medications}"
        )
        diagnosis = diagnose(
            patient_text=patient_text,
            specialty=specialty,
            vision_findings=vision_findings,
            rag_context=rag_context,
            patient_profile=patient_profile,
        )
    except Exception as e:
        logger.error(f"[CONSULT] Diagnosis error: {e}")
        diagnosis = {
            "differential_diagnoses": [{"condition": "Unable to generate diagnosis", "probability": 0}],
            "reasoning": f"Diagnosis generation failed: {str(e)}",
            "icd_codes": [],
        }

    # ── Step 8: Specialist response (in English) ──────────────────────────────
    try:
        raw_response = generate_specialist_response(specialty, diagnosis, patient_text)
    except Exception as e:
        logger.error(f"[CONSULT] Specialist response error: {e}")
        raw_response = (
            "I apologize, but I encountered an error generating a response. "
            "Please consult with your doctor."
        )

    # ── Step 9: Safety layer (in English) ─────────────────────────────────────
    try:
        vision_conf   = vision_findings.get("confidence") if vision_findings else None
        confidence    = score_confidence(patient_text, raw_response, vision_conf, diagnosis)
        safety_result = apply_safety_layer(patient_text, raw_response, confidence)
        final_response_en = safety_result["final_response"]
        flagged        = safety_result["flagged"]
    except Exception as e:
        logger.error(f"[CONSULT] Safety layer error: {e}")
        final_response_en = raw_response
        confidence     = 0.5
        flagged        = True

    # ── Step 9b: Translate response to patient language ────────────────────────
    if is_english:
        final_response = final_response_en
    else:
        try:
            final_response = translate_from_english(final_response_en, detected_language)
            logger.info(f"[CONSULT] Response translated to {detected_language}")
        except Exception as e:
            logger.error(f"[CONSULT] Translation to {detected_language} failed: {e}")
            final_response = final_response_en  # fallback: English

    # ── Step 10: TTS (in patient language) ─────────────────────────────────────
    try:
        audio_out = text_to_speech(final_response, language=detected_language)
    except Exception as e:
        logger.warning(f"[CONSULT] TTS error (continuing without audio): {e}")
        audio_out = None

    # ── Step 11: Save to DB ────────────────────────────────────────────────────
    try:
        record = Consultation(
            user_id=current_user.id,
            session_id=session_id,
            patient_text=patient_text_original,
            image_path=image_path,
            specialist=specialty,
            diagnosis=json.dumps(diagnosis),
            doctor_response=final_response,
            confidence=confidence,
            icd_codes=", ".join(icd_hints),
            flagged=flagged,
        )
        db.add(record)
        save_turn(session_id, "user",      patient_text_original, db)
        save_turn(session_id, "assistant", final_response, db)
        db.commit()
    except Exception as e:
        logger.error(f"[CONSULT] Database save error: {e}")
        db.rollback()

    logger.info(
        f"[CONSULT] Done | session={session_id[:8]} | "
        f"specialty={specialty} | confidence={confidence:.2f} | "
        f"flagged={flagged} | lang={detected_language}"
    )

    return {
        "session_id":      session_id,
        "patient_text":    patient_text_original,
        "patient_text_en": patient_text if not is_english else None,
        "specialist":      specialty,
        "urgency":         urgency,
        "triage":          triage_result,
        "vision_findings": vision_findings,
        "diagnosis":       diagnosis,
        "doctor_response": final_response,
        "confidence":      confidence,
        "icd_codes":       icd_hints,
        "flagged":         flagged,
        "language":        detected_language,
        "audio_path":      audio_out,
        "audio_url":       _public_audio_url(audio_out) if audio_out else None,
    }