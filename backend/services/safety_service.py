import re
import logging
from groq import Groq
from backend.config import GROQ_API_KEY, LLM_MODEL, CONFIDENCE_THRESHOLD

logger = logging.getLogger(__name__)

# ── Dangerous patterns - always block these ────────────────────────────────────
DANGEROUS_PATTERNS = [
    r"\b\d+\s*(mg|mcg|ml|units?)\b",           # specific dosages
    r"\bprescri(be|ption)\b",
    r"\btake\s+\d+",
    r"\binjec(t|tion)\b.*\b\d+",
]

EMERGENCY_KEYWORDS = [
    "chest pain", "can't breathe", "cannot breathe", "heart attack",
    "stroke", "unconscious", "severe bleeding", "overdose", "suicide",
    "poisoning", "seizure", "anaphylaxis", "difficulty breathing",
]

EMERGENCY_RESPONSE = (
    "This sounds like a medical emergency. "
    "Please call emergency services (112 or your local emergency number) immediately "
    "or go to the nearest emergency room right now. Do not wait."
)

DISCLAIMER = (
    "\n\nIMPORTANT: This is an AI assistant, not a licensed physician. "
    "Always consult a qualified doctor for diagnosis and treatment."
)


def check_emergency(text: str) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in EMERGENCY_KEYWORDS)


def sanitize_response(response: str) -> str:
    """Remove any dangerous dosage recommendations from the LLM output."""
    for pattern in DANGEROUS_PATTERNS:
        response = re.sub(pattern, "[dosage removed]", response, flags=re.IGNORECASE)
    return response


# ── Likelihood text → numeric weight ──────────────────────────────────────────
_LIKELIHOOD_MAP = {
    "high": 0.85,
    "medium": 0.55,
    "moderate": 0.55,
    "low": 0.25,
}


def _likelihood_to_float(likelihood: str) -> float:
    """Convert likelihood string ('high'/'medium'/'low') to a 0-1 float."""
    if isinstance(likelihood, (int, float)):
        return float(likelihood)
    return _LIKELIHOOD_MAP.get(str(likelihood).strip().lower(), 0.5)


def score_confidence(
    question: str,
    response: str,
    vision_confidence: float = None,
    diagnosis: dict = None,
) -> float:
    """
    Multi-factor confidence score (0.0–1.0).

    Factors:
      1. Symptom clarity   — length / detail of patient text        (weight 0.15)
      2. Diagnosis quality  — top-diagnosis likelihood + diff count  (weight 0.35)
      3. Vision confidence  — model's self-reported confidence       (weight 0.20 if image)
      4. Response hedging   — penalty for uncertain language         (weight 0.15)
      5. Refer flag penalty — if model says refer_to_specialist      (weight 0.15)
    """
    scores = {}

    # ── 1. Symptom clarity (0.0 – 1.0) ──────────────────────────────────────
    word_count = len(question.split())
    if word_count >= 20:
        scores["symptom_clarity"] = 1.0
    elif word_count >= 10:
        scores["symptom_clarity"] = 0.75
    elif word_count >= 5:
        scores["symptom_clarity"] = 0.5
    else:
        scores["symptom_clarity"] = 0.25

    # ── 2. Diagnosis quality (0.0 – 1.0) ─────────────────────────────────────
    diag_score = 0.5  # default when diagnosis unavailable
    if diagnosis:
        diffs = diagnosis.get("differential_diagnosis", [])
        if diffs:
            top_likelihood = _likelihood_to_float(diffs[0].get("likelihood", "medium"))
            # More differentials = more thorough analysis, cap benefit at 3
            breadth_bonus = min(len(diffs), 3) * 0.05
            diag_score = min(1.0, top_likelihood + breadth_bonus)
        else:
            diag_score = 0.2  # no differentials at all → low quality
    scores["diagnosis_quality"] = diag_score

    # ── 3. Vision confidence (0.0 – 1.0) ─────────────────────────────────────
    has_vision = vision_confidence is not None and vision_confidence > 0
    if has_vision:
        scores["vision_confidence"] = vision_confidence

    # ── 4. Response hedging penalty (0.0 – 1.0, higher = less hedging) ───────
    hedging_phrases = [
        "i'm not sure", "possibly", "might be", "could be", "consult",
        "see a doctor", "unable to determine", "not certain", "may indicate",
        "cannot confirm", "difficult to say", "unclear",
    ]
    hedge_count = sum(1 for p in hedging_phrases if p in response.lower())
    hedge_penalty = min(hedge_count * 0.12, 0.5)
    scores["response_certainty"] = max(0.0, 1.0 - hedge_penalty)

    # ── 5. Refer-to-specialist flag ──────────────────────────────────────────
    refer_penalty = 0.0
    if diagnosis and diagnosis.get("refer_to_specialist") is True:
        refer_penalty = 0.15
    scores["no_referral_needed"] = max(0.0, 1.0 - refer_penalty)

    # ── Weighted combination ─────────────────────────────────────────────────
    if has_vision:
        weights = {
            "symptom_clarity":    0.10,
            "diagnosis_quality":  0.30,
            "vision_confidence":  0.25,
            "response_certainty": 0.20,
            "no_referral_needed": 0.15,
        }
    else:
        weights = {
            "symptom_clarity":    0.15,
            "diagnosis_quality":  0.40,
            "response_certainty": 0.25,
            "no_referral_needed": 0.20,
        }

    combined = sum(scores.get(k, 0.5) * w for k, w in weights.items())
    final = round(max(0.05, min(1.0, combined)), 2)

    logger.info(
        f"[Safety] Confidence breakdown: {scores} → combined={final:.2f}"
    )
    return final


def apply_safety_layer(
    patient_text: str,
    response: str,
    confidence: float
) -> dict:
    """
    Full safety pipeline:
      - Emergency check
      - Dangerous content sanitization
      - Low-confidence referral injection
      - Disclaimer append
    Returns dict with final_response, flagged bool, and confidence.
    """
    flagged = False

    # Emergency override
    if check_emergency(patient_text):
        logger.warning("[Safety] Emergency keywords detected.")
        return {
            "final_response": EMERGENCY_RESPONSE,
            "flagged": True,
            "confidence": 1.0,
        }

    # Sanitize dangerous content
    response = sanitize_response(response)

    # Low confidence → add referral
    if confidence < CONFIDENCE_THRESHOLD:
        response += (
            " Given the uncertainty here, I strongly recommend you visit "
            "a qualified doctor or clinic for a proper examination."
        )
        flagged = True

    # Always append disclaimer
    response += DISCLAIMER

    return {
        "final_response": response,
        "flagged": flagged,
        "confidence": confidence,
    }
