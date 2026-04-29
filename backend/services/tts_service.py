import logging
import os
from gtts import gTTS
from backend.config import ELEVEN_API_KEY, ELEVEN_MODEL, ELEVEN_VOICE_ID

logger = logging.getLogger(__name__)

OUTPUT_PATH = "./backend/data/audio_output.mp3"


def text_to_speech(text: str, use_elevenlabs: bool = True) -> str:
    """
    Convert text to speech.
    Tries ElevenLabs first; falls back to gTTS if key is missing or call fails.
    Returns the path to the saved MP3 file.
    """
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    if use_elevenlabs and ELEVEN_API_KEY:
        try:
            return _elevenlabs_tts(text)
        except Exception as e:
            logger.warning(f"[TTS] ElevenLabs failed ({e}), falling back to gTTS.")

    return _gtts_tts(text)


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


def _gtts_tts(text: str) -> str:
    tts = gTTS(text=text, lang="en", slow=False)
    tts.save(OUTPUT_PATH)
    logger.info("[TTS] gTTS audio saved.")
    return OUTPUT_PATH
