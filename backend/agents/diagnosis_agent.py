import json
import logging
from groq import Groq
from backend.config import GROQ_API_KEY, LLM_MODEL

logger = logging.getLogger(__name__)

DIAGNOSIS_PROMPT = """You are a medical diagnosis assistant. Based on the patient's description,
image findings, and relevant medical knowledge, produce a structured clinical assessment.
Return a JSON object with these exact keys:
{
  "differential_diagnosis": [
    {"condition": "name", "likelihood": "high|medium|low", "reasoning": "brief reason"},
    ...up to 3 conditions...
  ],
  "recommended_tests": ["test1", "test2"],
  "red_flags": ["any warning signs to watch for"],
  "lifestyle_advice": ["general non-prescription advice"],
  "refer_to_specialist": true or false,
  "summary": "2-sentence plain English summary for the patient"
}
Never prescribe specific medications or dosages.
Return ONLY the JSON, no preamble."""


def diagnose(
    patient_text: str,
    specialty: str,
    vision_findings: dict = None,
    rag_context: str = "",
    patient_profile: str = "",
) -> dict:
    """
    Generate a structured differential diagnosis.
    Returns a dict with conditions, tests, red flags, and summary.
    """
    client = Groq(api_key=GROQ_API_KEY)

    user_content = (
        f"Specialty context: {specialty}\n"
        f"Patient says: {patient_text}\n"
    )
    if vision_findings and vision_findings.get("findings") != "Image analysis unavailable.":
        user_content += f"\nImage findings: {json.dumps(vision_findings)}\n"
    if rag_context:
        user_content += f"\nRelevant medical knowledge:\n{rag_context[:1000]}\n"
    if patient_profile:
        user_content += f"\nPatient profile: {patient_profile}\n"

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": DIAGNOSIS_PROMPT},
                {"role": "user",   "content": user_content},
            ],
            max_tokens=600,
            temperature=0.2,
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
        logger.info(f"[Diagnosis] Top condition: {result['differential_diagnosis'][0]['condition'] if result.get('differential_diagnosis') else 'N/A'}")
        return result
    except Exception as e:
        logger.error(f"[Diagnosis] Failed: {e}")
        return {
            "differential_diagnosis": [],
            "recommended_tests": [],
            "red_flags": [],
            "lifestyle_advice": [],
            "refer_to_specialist": True,
            "summary": "Unable to generate diagnosis. Please consult a doctor.",
        }
