from sqlalchemy import Column, Integer, String, Text
from database import Base


class Session(Base):
    __tablename__ = "sessions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(String, index=True)
    persona    = Column(String, default="supportive_friend")
    title      = Column(String, default="New Chat")
    created_at = Column(String)  # ISO string, e.g. "2026-04-02T17:00:00"


class Chat(Base):
    __tablename__ = "chats"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(String, index=True)
    session_id = Column(Integer, index=True, nullable=True)
    role       = Column(String)    # "user" / "assistant"
    message    = Column(Text)
    persona    = Column(String)


class Memory(Base):
    """Categorized, timestamped memory facts about a user."""
    __tablename__ = "memory"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(String, index=True)
    category   = Column(String, index=True, default="personal")
    # Categories: personal, relationship, preference, emotional, goal, context
    key        = Column(String)
    value      = Column(String)
    importance = Column(Integer, default=5)   # 1–10 scale
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)


class ConversationSummary(Base):
    """Auto-generated summary of a completed/long session."""
    __tablename__ = "conversation_summaries"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(String, index=True)
    session_id = Column(Integer, index=True)
    summary    = Column(Text)
    mood       = Column(String, nullable=True)    # dominant mood
    topics     = Column(String, nullable=True)     # comma-separated topics
    created_at = Column(String)


class MoodEntry(Base):
    """Per-exchange emotional state tracking."""
    __tablename__ = "mood_entries"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(String, index=True)
    session_id = Column(Integer, nullable=True)
    mood       = Column(String)               # "happy", "anxious", "sad", etc.
    intensity  = Column(Integer, default=5)   # 1–10
    context    = Column(String, nullable=True) # brief note
    created_at = Column(String)
