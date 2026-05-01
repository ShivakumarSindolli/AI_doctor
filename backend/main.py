import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from backend.database import init_db
from backend.services.rag_service import index_knowledge_base
from backend.routers.auth         import router as auth_router
from backend.routers.patients     import router as patients_router
from backend.routers.consultation import router as consult_router
from backend.routers.history      import router as history_router
from backend.routers.doctors      import router as doctors_router
from backend.routers.appointments import router as appointments_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Doctor Pro",
    description="High-level AI medical assistant with RAG, triage, vision, and safety guardrails.",
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-doctor-new.vercel.app",
        "https://shivakumar03-ai-doctor-pro.hf.space",
        "http://localhost:5173",
        "http://localhost:7860",
        "http://127.0.0.1:7860",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve audio output files ──────────────────────────────────────────────────
os.makedirs("./backend/data", exist_ok=True)
app.mount("/audio", StaticFiles(directory="./backend/data"), name="audio")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(consult_router)
app.include_router(history_router)
app.include_router(doctors_router)
app.include_router(appointments_router)


@app.on_event("startup")
def startup():
    logger.info("Initialising database...")
    init_db()
    logger.info("Indexing knowledge base for RAG...")
    index_knowledge_base()
    logger.info("AI Doctor Pro is ready.")


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "AI Doctor Pro API is running."}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
