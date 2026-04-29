import logging
from groq import Groq
from backend.config import GROQ_API_KEY, LLM_MODEL

logger = logging.getLogger(__name__)

SPECIALIST_PERSONAS = {
    "dermatology":       "a dermatologist specializing in skin, hair, and nail conditions",
    "cardiology":        "a cardiologist specializing in heart and cardiovascular conditions",
    "neurology":         "a neurologist specializing in brain and nervous system conditions",
    "orthopedics":       "an orthopedic specialist focusing on bones, joints, and muscles",
    "gastroenterology":  "a gastroenterologist specializing in digestive system conditions",
    "pulmonology":       "a pulmonologist specializing in lung and respiratory conditions",
    "psychiatry":        "a psychiatrist specializing in mental health and behavioral conditions",
    "ophthalmology":     "an ophthalmologist specializing in eye conditions",
    "ent":               "an ENT specialist focusing on ear, nose, and throat conditions",
    "endocrinology":     "an endocrinologist specializing in hormones and metabolic conditions",
    "urology":           "a urologist specializing in urinary tract and reproductive health",
    "general":           "a general practitioner providing primary care advice",
}

RESPONSE_PROMPT = """You are {persona}.
Based on the diagnosis below, craft a warm, clear, and empathetic spoken response for the patient.
Keep it to 3–4 sentences max. Speak directly to the patient (use "you").
Do NOT use markdown, bullet points, or lists — this will be read aloud.
Do NOT prescribe specific medications or dosages.
End with one clear next-step recommendation.

Diagnosis summary: {summary}
Red flags to mention (if any): {red_flags}
Refer to specialist: {refer}"""


def generate_specialist_response(
    specialty: str,
    diagnosis: dict,
    patient_text: str,
) -> str:
    """
    Generate a warm, spoken-style final response from the appropriate specialist persona.
    """
    persona   = SPECIALIST_PERSONAS.get(specialty, SPECIALIST_PERSONAS["general"])
    summary   = diagnosis.get("summary", "No diagnosis available.")
    red_flags = ", ".join(diagnosis.get("red_flags", [])) or "none"
    refer     = "yes, please refer to a specialist" if diagnosis.get("refer_to_specialist") else "no"

    client = Groq(api_key=GROQ_API_KEY)

    prompt = RESPONSE_PROMPT.format(
        persona=persona,
        summary=summary,
        red_flags=red_flags,
        refer=refer,
    )

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user",   "content": f"Patient's words: {patient_text}"},
            ],
            max_tokens=300,
            temperature=0.4,
        )
        text = response.choices[0].message.content.strip()
        logger.info(f"[Specialist:{specialty}] Response generated.")
        return text
    except Exception as e:
        logger.error(f"[Specialist] Response generation failed: {e}")
        return summary
