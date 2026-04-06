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
    __tablename__ = "memory"

    id       = Column(Integer, primary_key=True, index=True)
    user_id  = Column(String, index=True)
    key      = Column(String)   # e.g. "name", "location", "hobby", "mood_pattern"
    value    = Column(String)
