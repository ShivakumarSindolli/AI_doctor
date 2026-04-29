from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from backend.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {"sslmode": "require"}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Models ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    full_name     = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    age           = Column(Integer, nullable=True)
    gender        = Column(String, nullable=True)
    blood_type    = Column(String, nullable=True)
    allergies     = Column(Text, nullable=True)
    medications   = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    consultations = relationship("Consultation", back_populates="user")


class Consultation(Base):
    __tablename__ = "consultations"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id      = Column(String, index=True, nullable=False)
    patient_text    = Column(Text, nullable=True)      # transcribed speech
    image_path      = Column(String, nullable=True)
    specialist      = Column(String, nullable=True)    # routed specialist
    diagnosis       = Column(Text, nullable=True)      # structured JSON
    doctor_response = Column(Text, nullable=True)      # final spoken response
    confidence      = Column(Float, nullable=True)
    icd_codes       = Column(Text, nullable=True)      # comma-separated ICD-10
    flagged         = Column(Boolean, default=False)   # safety flag
    created_at      = Column(DateTime, default=datetime.utcnow)
    user            = relationship("User", back_populates="consultations")


class ConversationTurn(Base):
    __tablename__ = "conversation_turns"
    id          = Column(Integer, primary_key=True, index=True)
    session_id  = Column(String, index=True, nullable=False)
    role        = Column(String, nullable=False)        # "user" or "assistant"
    content     = Column(Text, nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
