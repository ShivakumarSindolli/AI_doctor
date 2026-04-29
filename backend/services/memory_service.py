import logging
from sqlalchemy.orm import Session
from backend.database import ConversationTurn
from backend.config import MAX_HISTORY_TURNS

logger = logging.getLogger(__name__)


def get_history(session_id: str, db: Session) -> list[dict]:
    """Fetch last N turns for a session, oldest first."""
    turns = (
        db.query(ConversationTurn)
        .filter(ConversationTurn.session_id == session_id)
        .order_by(ConversationTurn.created_at.asc())
        .limit(MAX_HISTORY_TURNS)
        .all()
    )
    return [{"role": t.role, "content": t.content} for t in turns]


def save_turn(session_id: str, role: str, content: str, db: Session):
    """Persist a conversation turn."""
    turn = ConversationTurn(session_id=session_id, role=role, content=content)
    db.add(turn)
    db.commit()
    logger.info(f"[Memory] Saved {role} turn for session {session_id[:8]}")


def clear_history(session_id: str, db: Session):
    """Clear all turns for a session (new consultation)."""
    db.query(ConversationTurn).filter(
        ConversationTurn.session_id == session_id
    ).delete()
    db.commit()
    logger.info(f"[Memory] Cleared history for session {session_id[:8]}")
