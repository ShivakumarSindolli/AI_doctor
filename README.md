# 🩺 AI Doctor Pro — High-Level AI Medical Assistant

A full-stack AI medical assistant with voice, vision, RAG, specialist triage, safety guardrails, 
patient auth, and consultation history. Built for learning and research purposes.

> ⚠️ **Disclaimer**: This is an educational project. Always consult a qualified physician.

---

## Architecture

```
User Voice + Image
       │
       ▼
┌─────────────────────────────────────────────────────┐
│               Gradio Frontend (port 7860)           │
│   Login · Register · Consult · Profile · History    │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP REST
                      ▼
┌─────────────────────────────────────────────────────┐
│               FastAPI Backend (port 8000)           │
│                                                     │
│  STT (Whisper)  →  Vision (Llama 4 Scout)           │
│       │                    │                        │
│       ▼                    ▼                        │
│   Triage Agent      RAG Pipeline                    │
│       │              (ChromaDB)                     │
│       ▼                    │                        │
│  Diagnosis Agent  ←────────┘                        │
│       │                                             │
│  Specialist Agent  →  Safety Guardrails             │
│                            │                        │
│                       TTS (ElevenLabs/gTTS)         │
│                            │                        │
│                    SQLite Database                  │
│              (patients · consultations · memory)    │
└─────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Details |
|---|---|
| 🎙️ Speech-to-Text | Groq Whisper large-v3 |
| 👁️ Medical Vision | Llama 4 Scout — structured image analysis |
| 🧠 RAG Pipeline | ChromaDB + medical knowledge base |
| 🔀 Triage Agent | Classifies specialty + urgency |
| 🔬 Diagnosis Agent | Differential diagnosis + ICD-10 hints |
| 🩺 Specialist Agents | 12 specialist personas |
| 🛡️ Safety Guardrails | Emergency detection, dosage removal, disclaimers |
| 💾 Conversation Memory | Multi-turn session history |
| 👤 Patient Auth | JWT login + profile (age, blood type, allergies) |
| 📋 History | Full consultation history per patient |
| 🔊 Text-to-Speech | ElevenLabs Flash v2.5 (auto-fallback to gTTS) |

---

## Setup

### 1. System Dependencies

**macOS:**
```bash
brew install ffmpeg portaudio
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg portaudio19-dev
```

**Windows:**
- Install FFmpeg from https://ffmpeg.org and add to PATH
- Install PortAudio from http://www.portaudio.com

---

### 2. API Keys

**Groq (required — free)**
1. Go to https://console.groq.com
2. Sign in → API Keys → Create API Key

**ElevenLabs (optional — free tier)**
1. Go to https://elevenlabs.io
2. Settings → API Keys → Create
3. If skipped, app uses free gTTS automatically

---

### 3. Install

```bash
# Unzip and enter the project folder
cd ai_doctor_pro

# Create virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

# Install dependencies (takes 2-5 mins first time)
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Open .env and add your GROQ_API_KEY and SECRET_KEY
```

---

### 4. Run

#### Option A — One command (recommended)
```bash
python run.py
```

#### Option B — Two terminals in Trae

**Terminal 1 — Backend:**
```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
python frontend/app.py
```

---

### 5. Use the App

1. Open **http://127.0.0.1:7860** in your browser
2. Go to **Login / Register** tab → create an account
3. Go to **Consultation** tab
4. 🎙️ Record your symptom → optionally upload a medical image
5. Click **Consult Doctor**
6. See transcription, triage, diagnosis, doctor response, and hear the voice output
7. View past consultations in **History** tab

**API docs:** http://127.0.0.1:8000/docs

---

## Project Structure

```
ai_doctor_pro/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # All settings + env vars
│   ├── database.py              # SQLAlchemy models + DB init
│   ├── auth.py                  # JWT auth helpers
│   ├── routers/
│   │   ├── auth.py              # POST /auth/register, /auth/login
│   │   ├── consultation.py      # POST /consult/ — main pipeline
│   │   ├── patients.py          # GET/PUT /patients/me
│   │   └── history.py           # GET /history/
│   ├── services/
│   │   ├── stt_service.py       # Groq Whisper STT
│   │   ├── tts_service.py       # ElevenLabs + gTTS fallback
│   │   ├── vision_service.py    # Llama 4 Scout image analysis
│   │   ├── rag_service.py       # ChromaDB RAG pipeline
│   │   ├── safety_service.py    # Guardrails + confidence scoring
│   │   └── memory_service.py    # Conversation turn storage
│   ├── agents/
│   │   ├── triage_agent.py      # Specialty + urgency classifier
│   │   ├── diagnosis_agent.py   # Differential diagnosis generator
│   │   └── specialist_agents.py # 12 specialist response personas
│   └── data/
│       └── knowledge_base/      # Medical text files for RAG
│           ├── dermatology.txt
│           ├── cardiology.txt
│           ├── general_medicine.txt
│           └── neurology_ortho.txt
├── frontend/
│   └── app.py                   # Gradio UI
├── run.py                       # Start both services at once
├── .env.example                 # API key template
├── requirements.txt
└── README.md
```

---

## Troubleshooting

| Error | Fix |
|---|---|
| `ModuleNotFoundError` | Activate venv + `pip install -r requirements.txt` |
| `GROQ_API_KEY not set` | Check `.env` file exists with correct key |
| `pyaudio` fails on Windows | `pip install pipwin` then `pipwin install pyaudio` |
| ChromaDB install fails | `pip install chromadb --upgrade` |
| Port already in use | Change port in `run.py` or kill the process using the port |
| Frontend shows "Login first" | Register/login in the Login tab first |
