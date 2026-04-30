import logging
import os
from gtts import gTTS
from backend.config import ELEVEN_API_KEY, ELEVEN_MODEL, ELEVEN_VOICE_ID, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

OUTPUT_PATH = "./backend/data/audio_output.mp3"


def text_to_speech(text: str, language: str = "en", use_elevenlabs: bool = True) -> str:
    """
    Convert text to speech with multilingual support.
    Tries ElevenLabs for English; uses gTTS for all languages.
    Returns the path to the saved MP3 file.
    """
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    # ElevenLabs only for English (limited Indic language support)
    if use_elevenlabs and ELEVEN_API_KEY and language == "en":
        try:
            return _elevenlabs_tts(text)
        except Exception as e:
            logger.warning(f"[TTS] ElevenLabs failed ({e}), falling back to gTTS.")

    return _gtts_tts(text, language)


def _elevenlabs_tts(text: str) -> str:
    from elevenlabs.client import ElevenLabs

    client = ElevenLabs(api_key=ELEVEN_API_KEY)
    stream = client.text_to_speech.convert(
        text=text,
        voice_id=ELEVEN_VOICE_ID,
        model_id=ELEVEN_MODEL,
        output_format="mp3_22050_32",
    )
    with open(OUTPUT_PATH, "wb") as f:
        for chunk in stream:
            f.write(chunk)
    logger.info("[TTS] ElevenLabs audio saved.")
    return OUTPUT_PATH


def _gtts_tts(text: str, language: str = "en") -> str:
    """
    Generate TTS audio using Google gTTS.
    Supports: en (English), hi (Hindi), kn (Kannada), mr (Marathi)
    """
    # Get the TTS language code from config, fallback to the code itself
    lang_meta = SUPPORTED_LANGUAGES.get(language)
    tts_lang = lang_meta["tts"] if lang_meta else language

    # Validate gTTS supports this language
    valid_tts_langs = {"en", "hi", "kn", "mr"}
    if tts_lang not in valid_tts_langs:
        logger.warning(f"[TTS] Language '{tts_lang}' not in gTTS supported set, falling back to English")
        tts_lang = "en"

    try:
        tts = gTTS(text=text, lang=tts_lang, slow=False)
        tts.save(OUTPUT_PATH)
        lang_name = lang_meta["name"] if lang_meta else tts_lang
        logger.info(f"[TTS] gTTS audio saved ({lang_name}).")
        return OUTPUT_PATH
    except Exception as e:
        logger.error(f"[TTS] gTTS failed for language '{tts_lang}': {e}")
        # Last resort fallback to English
        if tts_lang != "en":
            logger.info("[TTS] Retrying with English...")
            tts = gTTS(text=text, lang="en", slow=False)
            tts.save(OUTPUT_PATH)
            return OUTPUT_PATH
        raise
