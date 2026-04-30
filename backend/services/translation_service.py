import logging
from groq import Groq
from backend.config import GROQ_API_KEY, LLM_MODEL, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

# ── Language metadata ────────────────────────────────────────────────────────
LANG_NAMES = {code: meta["name"] for code, meta in SUPPORTED_LANGUAGES.items()}


def _is_english(lang_code: str) -> bool:
    """Check if the language code is English."""
    return (lang_code or "en").lower().startswith("en")


def translate_to_english(text: str, source_lang: str) -> str:
    """
    Translate patient text from source language to English.
    Skips API call if source is already English.
    Returns English translation.
    """
    if not text or not text.strip():
        return text

    if _is_english(source_lang):
        return text

    source_name = LANG_NAMES.get(source_lang, source_lang)
    logger.info(f"[Translation] Translating {source_name} → English ({len(text)} chars)")

    client = Groq(api_key=GROQ_API_KEY)

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are a medical translator. Translate the following {source_name} text "
                        "to English accurately. Preserve medical terminology and meaning. "
                        "Return ONLY the English translation, nothing else."
                    ),
                },
                {"role": "user", "content": text},
            ],
            max_tokens=500,
            temperature=0.1,
        )
        translated = response.choices[0].message.content.strip()
        logger.info(f"[Translation] {source_name} → English: {len(translated)} chars")
        return translated

    except Exception as e:
        logger.error(f"[Translation] Failed to translate to English: {e}")
        return text  # fallback: return original text


def translate_from_english(text: str, target_lang: str) -> str:
    """
    Translate doctor response from English to the target language.
    Skips API call if target is English.
    Returns translated text.
    """
    if not text or not text.strip():
        return text

    if _is_english(target_lang):
        return text

    target_name = LANG_NAMES.get(target_lang, target_lang)
    logger.info(f"[Translation] Translating English → {target_name} ({len(text)} chars)")

    client = Groq(api_key=GROQ_API_KEY)

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are a medical translator. Translate the following English medical text "
                        f"to {target_name} accurately. Use simple, patient-friendly language that a "
                        f"common {target_name}-speaking person would understand. Preserve medical "
                        "term meanings but use everyday words where possible. "
                        f"Return ONLY the {target_name} translation, nothing else."
                    ),
                },
                {"role": "user", "content": text},
            ],
            max_tokens=800,
            temperature=0.2,
        )
        translated = response.choices[0].message.content.strip()
        logger.info(f"[Translation] English → {target_name}: {len(translated)} chars")
        return translated

    except Exception as e:
        logger.error(f"[Translation] Failed to translate to {target_name}: {e}")
        return text  # fallback: return English text
