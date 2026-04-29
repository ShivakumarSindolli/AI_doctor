import json
import logging
from groq import Groq
from backend.config import GROQ_API_KEY, LLM_MODEL

logger = logging.getLogger(__name__)

SPECIALTIES = [
    "dermatology", "cardiology", "neurology", "orthopedics",
    "gastroenterology", "pulmonology", "psychiatry", "general",
    "ophthalmology", "ent", "endocrinology", "urology",
]

TRIAGE_PROMPT = """You are a medical triage system. Analyze the patient's complaint and image findings.
Return a JSON object with these exact keys:
{
  "specialty": one of """ + str(SPECIALTIES) + """,
  "urgency": "emergency | urgent | routine",
  "primary_complaint": "one sentence summary",
  "icd_hints": ["up to 3 likely ICD-10 category names, not codes"],
  "reasoning": "brief triage reasoning"
}
Return ONLY the JSON, no preamble."""


def triage(patient_text: str, vision_findings: dict = None) -> dict:
    """
    Classify the patient's case into a specialty and urgency level.
    Returns structured triage dict.
    """
    client = Groq(api_key=GROQ_API_KEY)

    content = f"Patient says: {patient_text}"
    if vision_findings and vision_findings.get("findings"):
        content += f"\n\nImage findings: {json.dumps(vision_findings)}"

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": TRIAGE_PROMPT},
                {"role": "user",   "content": content},
            ],
            max_tokens=300,
            temperature=0.1,
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
        logger.info(f"[Triage] Specialty={result.get('specialty')} Urgency={result.get('urgency')}")
        return result
    except Exception as e:
        logger.error(f"[Triage] Failed: {e}")
        return {
            "specialty": "general",
            "urgency": "routine",
            "primary_complaint": patient_text[:100],
            "icd_hints": [],
            "reasoning": "Triage unavailable, defaulting to general.",
        }
