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


def score_confidence(question: str, response: str, vision_confidence: float = None) -> float:
    """
    Heuristic confidence score (0.0–1.0).
    Combines: keyword hedging in response + vision confidence if available.
    """
    hedging_phrases = [
        "i'm not sure", "possibly", "might be", "could be", "consult",
        "see a doctor", "unable to determine", "not certain", "may indicate"
    ]
    hedge_count = sum(1 for p in hedging_phrases if p in response.lower())
    hedge_penalty = min(hedge_count * 0.1, 0.4)

    base = 0.75
    if vision_confidence is not None:
        base = (base + vision_confidence) / 2

    return round(max(0.1, base - hedge_penalty), 2)


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
