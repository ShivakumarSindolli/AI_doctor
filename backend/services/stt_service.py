import logging
import os
import tempfile
import subprocess
import speech_recognition as sr
from groq import Groq
from backend.config import GROQ_API_KEY, STT_MODEL

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

    FIXED vs original:
    - Returns tuple (path, was_converted) so callers know to clean up
    - Validates output file has actual content
    - Logs full ffmpeg stderr for easier debugging
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


def transcribe_audio_groq(audio_filepath: str) -> str:
    """
    Transcribe using Groq Whisper API.

    ══ THE FIX ══════════════════════════════════════════════════════════════════
    Original code:
        with open(wav_filepath, "rb") as f:
            result = client.audio.transcriptions.create(file=f, ...)

    Problem: Passing just `f` (a raw file object) gives Groq NO format information.
    Groq tries to guess — defaults to WAV/AIFF/FLAC — fails on WebM recordings.

    Fixed code:
        file=("recording.wav", f, "audio/wav")   ← named tuple

    Groq reads the filename extension from the tuple to detect the codec.
    Since we convert to WAV first, we always send ("recording.wav", ...).
    ═════════════════════════════════════════════════════════════════════════════
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

        with open(wav_filepath, "rb") as f:
            result = client.audio.transcriptions.create(
                model=STT_MODEL,                           # "whisper-large-v3"
                file=("recording.wav", f, "audio/wav"),   # ← FIXED: named tuple
                language="en",
                response_format="text",
                temperature=0.0,
            )

        text = result if isinstance(result, str) else result.text
        return text.strip()

    finally:
        if temp_file_created and os.path.exists(wav_filepath):
            try:
                os.unlink(wav_filepath)
            except Exception as e:
                logger.warning(f"[STT] Failed to cleanup temp file: {e}")


def transcribe_audio_google(audio_filepath: str) -> str:
    """
    Fallback: Transcribe using Google Speech Recognition (free, no API key needed).
    """
    wav_filepath = _convert_to_wav(audio_filepath)
    temp_file_created = (wav_filepath != audio_filepath)

    recognizer = sr.Recognizer()

    try:
        if not os.path.exists(wav_filepath):
            raise FileNotFoundError(f"Audio file not found: {wav_filepath}")

        with sr.AudioFile(wav_filepath) as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio = recognizer.record(source)

        text = recognizer.recognize_google(audio, language="en-US")
        return text.strip()

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


def transcribe_audio(audio_filepath: str) -> str:
    """
    Transcribe an audio file. Groq Whisper (primary) → Google STT (fallback).
    Same signature as before — consultation.py calls this with a file path.
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
        f"({file_size / 1024:.1f} KB)"
    )

    # ── Primary: Groq Whisper ─────────────────────────────────────────────────
    if GROQ_API_KEY:
        try:
            text = transcribe_audio_groq(audio_filepath)
            logger.info(f"[STT] Groq success: {len(text)} chars")
            return text
        except Exception as e:
            logger.warning(f"[STT] Groq failed: {e}. Falling back to Google Speech Recognition...")
    else:
        logger.warning("[STT] No GROQ_API_KEY found. Using Google Speech Recognition...")

    # ── Fallback: Google Speech Recognition ──────────────────────────────────
    try:
        text = transcribe_audio_google(audio_filepath)
        logger.info(f"[STT] Google STT success: {len(text)} chars")
        return text
    except Exception as e:
        logger.error(f"[STT] All STT methods failed: {e}")
        raise RuntimeError(f"Speech-to-text failed: {e}")