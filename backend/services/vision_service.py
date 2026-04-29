import base64
import logging
from groq import Groq
from backend.config import GROQ_API_KEY, VISION_MODEL

logger = logging.getLogger(__name__)

VISION_SYSTEM_PROMPT = """You are a medical image analysis assistant with expertise in clinical imaging.
Analyze the provided image and return a structured JSON response with these exact keys:
{
  "findings": "detailed description of visible findings",
  "region": "body region or organ visible",
  "abnormalities": ["list", "of", "abnormalities", "if", "any"],
  "severity": "normal | mild | moderate | severe",
  "image_type": "photograph | xray | mri | ct | ultrasound | other",
  "suggested_specialties": ["dermatology", "cardiology", etc],
  "confidence": 0.0 to 1.0
}
Be objective. If the image is not medical, set findings to 'non-medical image' and confidence to 0.1.
Return ONLY the JSON object, no preamble."""


def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def analyze_image(image_path: str) -> dict:
    """
    Analyze a medical image using Llama 4 Scout vision model via Groq.
    Returns a structured dict of findings.
    """
    import json

    client = Groq(api_key=GROQ_API_KEY)
    encoded = encode_image(image_path)

    try:
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": VISION_SYSTEM_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{encoded}"},
                        },
                    ],
                }
            ],
            max_tokens=600,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
        logger.info(f"[Vision] Findings: {result.get('findings', '')[:60]}")
        return result
    except Exception as e:
        logger.error(f"[Vision] Image analysis failed: {e}")
        return {
            "findings": "Image analysis unavailable.",
            "region": "unknown",
            "abnormalities": [],
            "severity": "unknown",
            "image_type": "unknown",
            "suggested_specialties": ["general"],
            "confidence": 0.0,
        }
