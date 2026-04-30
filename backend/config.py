import os
from dotenv import load_dotenv

load_dotenv()

# ── API Keys ───────────────────────────────────────────────────────────────────
GROQ_API_KEY     = os.environ.get("GROQ_API_KEY", "")
ELEVEN_API_KEY   = os.environ.get("ELEVEN_API_KEY", "")
SECRET_KEY       = os.environ.get("SECRET_KEY", "changeme-use-a-long-random-string")

# ── Database ───────────────────────────────────────────────────────────────────
DATABASE_URL     = os.environ.get("DATABASE_URL", "sqlite:///./ai_doctor.db")

# ── Models ─────────────────────────────────────────────────────────────────────
VISION_MODEL     = "meta-llama/llama-4-scout-17b-16e-instruct"
STT_MODEL        = "whisper-large-v3"
LLM_MODEL        = "llama-3.3-70b-versatile"   # text-only reasoning
ELEVEN_MODEL     = "eleven_flash_v2_5"
ELEVEN_VOICE_ID  = "9BWtsMINqrJLrRacOk9x"      # Aria

# ── Auth ───────────────────────────────────────────────────────────────────────
JWT_ALGORITHM    = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24            # 24 hours

# ── RAG ────────────────────────────────────────────────────────────────────────
CHROMA_DIR       = "./backend/data/chroma_db"
KNOWLEDGE_DIR    = "./backend/data/knowledge_base"
RAG_TOP_K        = 5                             # top chunks to retrieve

# ── Safety ─────────────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.4                       # below this → always refer to doctor
MAX_HISTORY_TURNS    = 10                        # memory window per session

# ── Multilingual ───────────────────────────────────────────────────────
SUPPORTED_LANGUAGES = {
    "en": {"name": "English",  "native": "English",  "stt": "en", "tts": "en", "google_stt": "en-US"},
    "hi": {"name": "Hindi",    "native": "हिन्दी",    "stt": "hi", "tts": "hi", "google_stt": "hi-IN"},
    "kn": {"name": "Kannada",  "native": "ಕನ್ನಡ",    "stt": "kn", "tts": "kn", "google_stt": "kn-IN"},
    "mr": {"name": "Marathi",  "native": "मराठी",     "stt": "mr", "tts": "mr", "google_stt": "mr-IN"},
}
