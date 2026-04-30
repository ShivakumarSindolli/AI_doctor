import logging
import os
import tempfile
import subprocess
import speech_recognition as sr
from groq import Groq
from backend.config import GROQ_API_KEY, STT_MODEL, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)


def _find_ffmpeg() -> str:
    """
    Find ffmpeg — checks PATH first, then your WinGet install, then common locations.
    """
    # 1. Try PATH first (works if ffmpeg is properly installed)
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        if result.returncode == 0:
            return "ffmpeg"
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # 2. Your WinGet install path
    winget_path = (
        r"C:\Users\Shivakumar\AppData\Local\Microsoft\WinGet\Packages"
        r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
        r"\ffmpeg-8.1-full_build\bin\ffmpeg.exe"
    )
    if os.path.exists(winget_path):
        return winget_path

    # 3. Other common Windows paths
    for path in [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
    ]:
        if os.path.exists(path):
            return path

    logger.warning("[STT] ffmpeg not found in any known location")
    return "ffmpeg"


def _convert_to_wav(audio_filepath: str) -> str:
    """
    Convert audio file to WAV format using ffmpeg.
    Returns path to WAV file (original if already WAV, converted temp file otherwise).
    """
    try:
        ext = os.path.splitext(audio_filepath)[1].lower()

        if ext == ".wav":
            return audio_filepath

        logger.info(f"[STT] Converting {ext} → WAV...")

        temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False, prefix="medai_stt_")
        temp_wav_path = temp_wav.name
        temp_wav.close()

        ffmpeg_path = _find_ffmpeg()

        cmd = [
            ffmpeg_path,
            "-y",                      # overwrite output
            "-i", audio_filepath,
            "-acodec", "pcm_s16le",   # 16-bit PCM WAV — what Whisper natively reads
            "-ar", "16000",            # 16 kHz
            "-ac", "1",                # mono
            temp_wav_path,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        if result.returncode != 0:
            logger.error(f"[STT] ffmpeg error (exit {result.returncode}):\n{result.stderr}")
            if os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)
            return audio_filepath   # fall through with original

        if not os.path.exists(temp_wav_path) or os.path.getsize(temp_wav_path) == 0:
            logger.error("[STT] ffmpeg produced empty output file")
            if os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)
            return audio_filepath

        size_kb = os.path.getsize(temp_wav_path) / 1024
        logger.info(f"[STT] Converted to WAV: {temp_wav_path} ({size_kb:.1f} KB)")
        return temp_wav_path

    except subprocess.TimeoutExpired:
        logger.error("[STT] ffmpeg timed out")
        return audio_filepath
    except Exception as e:
        logger.error(f"[STT] Audio conversion failed: {e}")
        return audio_filepath


def transcribe_audio_groq(audio_filepath: str, language: str = None) -> dict:
    """
    Transcribe using Groq Whisper API.
    Supports multilingual transcription.
    Returns dict with 'text' and 'language' keys.
    """
    wav_filepath = _convert_to_wav(audio_filepath)
    temp_file_created = (wav_filepath != audio_filepath)

    try:
        if not os.path.exists(wav_filepath):
            raise FileNotFoundError(f"Audio file not found: {wav_filepath}")

        file_size = os.path.getsize(wav_filepath)
        if file_size == 0:
            raise ValueError("Audio file is empty — nothing to transcribe")

        logger.info(f"[STT] Sending to Groq Whisper: {wav_filepath} ({file_size / 1024:.1f} KB)")

        client = Groq(api_key=GROQ_API_KEY)

        # Build transcription params
        # If language is specified (not 'auto'), pass it to Whisper for better accuracy
        # If 'auto' or None, omit language param so Whisper auto-detects
        whisper_params = {
            "model": STT_MODEL,
            "file": ("recording.wav", open(wav_filepath, "rb"), "audio/wav"),
            "response_format": "verbose_json",  # gives us detected language
            "temperature": 0.0,
        }

        stt_lang = None
        if language and language != "auto":
            lang_meta = SUPPORTED_LANGUAGES.get(language)
            if lang_meta:
                stt_lang = lang_meta["stt"]
                whisper_params["language"] = stt_lang
                logger.info(f"[STT] Language hint: {stt_lang} ({lang_meta['name']})")

        with open(wav_filepath, "rb") as f:
            whisper_params["file"] = ("recording.wav", f, "audio/wav")
            result = client.audio.transcriptions.create(**whisper_params)

        # Extract text and detected language
        if hasattr(result, "text"):
            text = result.text.strip()
        elif isinstance(result, str):
            text = result.strip()
        else:
            text = str(result).strip()

        # Try to get detected language from verbose_json response
        detected_lang = stt_lang or language or "en"
        if hasattr(result, "language"):
            detected_lang = result.language or detected_lang

        # Map Whisper language codes to our codes
        lang_map = {"english": "en", "hindi": "hi", "kannada": "kn", "marathi": "mr"}
        if detected_lang in lang_map:
            detected_lang = lang_map[detected_lang]

        logger.info(f"[STT] Groq success: {len(text)} chars, detected_lang={detected_lang}")
        return {"text": text, "language": detected_lang}

    finally:
        if temp_file_created and os.path.exists(wav_filepath):
            try:
                os.unlink(wav_filepath)
            except Exception as e:
                logger.warning(f"[STT] Failed to cleanup temp file: {e}")


def transcribe_audio_google(audio_filepath: str, language: str = None) -> dict:
    """
    Fallback: Transcribe using Google Speech Recognition (free, no API key needed).
    Supports multilingual recognition.
    Returns dict with 'text' and 'language' keys.
    """
    wav_filepath = _convert_to_wav(audio_filepath)
    temp_file_created = (wav_filepath != audio_filepath)

    recognizer = sr.Recognizer()

    # Determine Google STT language code
    google_lang = "en-US"
    lang_code = language or "en"
    lang_meta = SUPPORTED_LANGUAGES.get(lang_code)
    if lang_meta:
        google_lang = lang_meta["google_stt"]

    try:
        if not os.path.exists(wav_filepath):
            raise FileNotFoundError(f"Audio file not found: {wav_filepath}")

        with sr.AudioFile(wav_filepath) as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio = recognizer.record(source)

        logger.info(f"[STT] Google STT with language: {google_lang}")
        text = recognizer.recognize_google(audio, language=google_lang)
        return {"text": text.strip(), "language": lang_code}

    except sr.UnknownValueError:
        raise RuntimeError("Google STT: Could not understand the audio. Please speak clearly.")
    except sr.RequestError as e:
        raise RuntimeError(f"Google STT service error: {e}")
    finally:
        if temp_file_created and os.path.exists(wav_filepath):
            try:
                os.unlink(wav_filepath)
            except Exception as e:
                logger.warning(f"[STT] Failed to cleanup temp file: {e}")


def transcribe_audio(audio_filepath: str, language: str = None) -> dict:
    """
    Transcribe an audio file. Groq Whisper (primary) → Google STT (fallback).
    Returns dict: {"text": "transcribed text", "language": "detected_lang_code"}
    """
    if not audio_filepath:
        raise ValueError("No audio file provided for transcription.")

    if not os.path.exists(audio_filepath):
        raise ValueError(f"Audio file does not exist: {audio_filepath}")

    file_size = os.path.getsize(audio_filepath)
    if file_size == 0:
        raise ValueError(
            "Audio file is empty (0 bytes). "
            "Please record for at least 1–2 seconds and try again."
        )

    logger.info(
        f"[STT] Transcribing: {os.path.basename(audio_filepath)} "
        f"({file_size / 1024:.1f} KB) | language={language or 'auto'}"
    )

    # ── Primary: Groq Whisper ─────────────────────────────────────────────────
    if GROQ_API_KEY:
        try:
            result = transcribe_audio_groq(audio_filepath, language)
            logger.info(f"[STT] Groq success: {len(result['text'])} chars, lang={result['language']}")
            return result
        except Exception as e:
            logger.warning(f"[STT] Groq failed: {e}. Falling back to Google Speech Recognition...")
    else:
        logger.warning("[STT] No GROQ_API_KEY found. Using Google Speech Recognition...")

    # ── Fallback: Google Speech Recognition ──────────────────────────────────
    try:
        result = transcribe_audio_google(audio_filepath, language)
        logger.info(f"[STT] Google STT success: {len(result['text'])} chars, lang={result['language']}")
        return result
    except Exception as e:
        logger.error(f"[STT] All STT methods failed: {e}")
        raise RuntimeError(f"Speech-to-text failed: {e}")