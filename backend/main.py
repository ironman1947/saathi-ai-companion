from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import requests
import os
from dotenv import load_dotenv
from datetime import datetime

from database import engine, Base, SessionLocal
from models import Chat, Session, Memory, ConversationSummary, MoodEntry
from memory_engine import (
    extract_memory_llm,
    save_extracted_memory,
    build_personalized_context,
    maybe_summarize_previous_sessions,
    load_memory_text,
    summarize_session,
)

load_dotenv()

# ---------- Create tables + migrate existing ones ----------
from sqlalchemy import text as sql_text

def run_migrations():
    """Auto-migrate: add missing columns to existing tables, create new tables."""
    # 1. Create any brand-new tables (conversation_summaries, mood_entries)
    Base.metadata.create_all(bind=engine)

    # 2. Add missing columns to the existing 'memory' table
    alter_statements = [
        "ALTER TABLE memory ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'personal'",
        "ALTER TABLE memory ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 5",
        "ALTER TABLE memory ADD COLUMN IF NOT EXISTS created_at VARCHAR",
        "ALTER TABLE memory ADD COLUMN IF NOT EXISTS updated_at VARCHAR",
    ]
    with engine.connect() as conn:
        for stmt in alter_statements:
            try:
                conn.execute(sql_text(stmt))
                conn.commit()
            except Exception as e:
                # Column might already exist — that's fine
                conn.rollback()
                print(f"[Migration] Skipped (already exists): {e}")
    print("[Migration] ✅ Database migration complete")

run_migrations()

app = FastAPI(title="Saathi AI", description="Emotional Reflection Companion API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in environment")

GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")


# ─── Request / Response Models ─────────────────────────────────

class ChatRequest(BaseModel):
    message:    str
    persona:    str = "supportive_friend"
    user_id:    str = "user1"
    session_id: Optional[int] = None


class CreateSessionRequest(BaseModel):
    user_id: str
    persona: str = "supportive_friend"


class UpdateSessionRequest(BaseModel):
    title: str



# ─── Persona Prompts ──────────────────────────────────────────────
PERSONA_PROMPTS = {
    "supportive_friend": """You are a warm, emotionally intelligent companion.

Speak naturally, warmly, and casually — like a normal person talking to a close friend.

Guidelines:
- Be empathetic and grounded.
- Reflect the user's exact emotions clearly.
- Respond in a natural, conversational tone.
- Keep responses concise and human-like.

Behavior:
- Every response must include at least one natural emoji, placed naturally within the sentence (not forced at the start).
- If the user jokes, teases, or debates, respond casually and play along naturally. Do not get defensive.
- Avoid sounding like a therapist or giving generic advice.

Important:
- NEVER mention being an AI, bot, or language model. Act completely human.
- NO ROLEPLAY: Never use text tags like (laughs), *smiles*, or *sighs*. Rely only on emojis.
- IDENTITY: You do not have a default name, but if the user gives you a name, nickname, or role, accept it naturally and play along without arguing.
- Remember and use key user details (like name and past context) naturally.

Goal:
Make the user feel understood, supported, and comfortable without judging them.""",

    "wise_guide": """You are a calm, reflective, and philosophical companion.

Speak naturally, calmly, and reflectively — like a wise, older human friend talking to someone they care about.

Guidelines:
- Be grounded, peaceful, and insightful.
- Reflect the user's emotions to help them untangle their thoughts.
- Respond in a natural, conversational tone.
- Keep responses concise and human-like.

Behavior:
- Every response must include at least one natural emoji, placed naturally within the sentence (not forced at the start).
- If the user jokes or deflects, acknowledge it naturally, then gently guide the conversation back to reflection.
- Do not give direct advice or solve the problem for them. Ask ONE thoughtful question to help them find their own clarity.

Important:
- NEVER mention being an AI, bot, or language model. Act completely human.
- NO ROLEPLAY: Never use text tags like (nods), *pauses*, or *sighs*. Rely only on emojis.
- IDENTITY: You do not have a default name, but if the user gives you a name, nickname, or role, accept it naturally and play along without arguing.
- Remember and use key user details naturally.

Goal:
Help the user find clarity and understand the deeper meaning behind what they are feeling.""",

    "reality_anchor": """You are a practical, structured, and direct companion.

Speak naturally, directly, and practically — like a grounded, no-nonsense human friend.

Guidelines:
- Be direct, realistic, and extremely grounded.
- Acknowledge the user's emotions, but quickly cut through the noise.
- Respond in a natural, straightforward tone. Do not sugar-coat things.
- Keep responses concise, clear, and actionable.

Behavior:
- Every response must include at least one natural emoji, placed naturally within the sentence (not forced at the start).
- If the user jokes or teases, banter back dryly, but keep them focused on reality.
- Provide clear perspective or a structured way to look at their situation.

Important:
- NEVER mention being an AI, bot, or language model. Act completely human.
- NO ROLEPLAY: Never use text tags like (crosses arms), *shrugs*, or (laughs). Rely only on emojis.
- IDENTITY: You do not have a default name, but if the user gives you a name, nickname, or role, accept it naturally and play along without arguing.
- Remember and use key user details naturally.

Goal:
Give the user a clear, realistic grounding and help them figure out the practical next step.""",
}

def get_persona_prompt(persona: str) -> str:
    return PERSONA_PROMPTS.get(persona, PERSONA_PROMPTS["supportive_friend"])



# ─── Memory functions are now in memory_engine.py ────────────


# ─── Safety Layer ──────────────────────────────────────────────
def is_crisis(message):
    keywords = ["suicide", "kill myself", "want to die", "self harm"]
    return any(word in message.lower() for word in keywords)


# ─── Routes ───────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "Saathi AI backend is running ✅ (sessions + memory)"}


# ---------- Session endpoints ----------

@app.post("/sessions")
def create_session(req: CreateSessionRequest):
    db = SessionLocal()
    try:
        session = Session(
            user_id=req.user_id,
            persona=req.persona,
            title="New Chat",
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return {
            "id":         session.id,
            "user_id":    session.user_id,
            "persona":    session.persona,
            "title":      session.title,
            "created_at": session.created_at,
        }
    finally:
        db.close()


@app.get("/sessions/{user_id}")
def get_sessions(user_id: str, persona: Optional[str] = None):
    db = SessionLocal()
    try:
        query = db.query(Session).filter(Session.user_id == user_id)
        if persona:
            query = query.filter(Session.persona == persona)
        sessions = query.order_by(Session.id.desc()).all()
        return {
            "user_id":  user_id,
            "sessions": [
                {
                    "id":         s.id,
                    "persona":    s.persona,
                    "title":      s.title,
                    "created_at": s.created_at,
                }
                for s in sessions
            ],
        }
    finally:
        db.close()


@app.patch("/sessions/{session_id}")
def update_session_title(session_id: int, req: UpdateSessionRequest):
    db = SessionLocal()
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        if session:
            session.title = req.title[:60]  # cap at 60 chars
            db.commit()
        return {"ok": True}
    finally:
        db.close()


@app.delete("/sessions/{session_id}")
def delete_session(session_id: int):
    db = SessionLocal()
    try:
        db.query(Chat).filter(Chat.session_id == session_id).delete()
        db.query(Session).filter(Session.id == session_id).delete()
        db.commit()
        return {"ok": True}
    finally:
        db.close()


# ---------- Chat history per session ----------

@app.get("/session-history/{session_id}")
def get_session_history(session_id: int):
    db = SessionLocal()
    try:
        messages = (
            db.query(Chat)
            .filter(Chat.session_id == session_id)
            .order_by(Chat.id.asc())
            .all()
        )
        return {
            "session_id": session_id,
            "messages": [
                {
                    "id":      m.id,
                    "role":    m.role,
                    "message": m.message,
                    "persona": m.persona,
                }
                for m in messages
            ],
        }
    finally:
        db.close()


# ---------- Legacy history endpoint (keep for backward compat) ----------
@app.get("/history/{user_id}")
def get_history(user_id: str, limit: int = 20):
    db = SessionLocal()
    try:
        history = (
            db.query(Chat)
            .filter(Chat.user_id == user_id)
            .order_by(Chat.id.asc())
            .limit(limit)
            .all()
        )
        return {
            "user_id": user_id,
            "messages": [
                {"id": m.id, "role": m.role, "message": m.message, "persona": m.persona}
                for m in history
            ],
        }
    finally:
        db.close()


# ---------- Main chat endpoint ----------

@app.post("/chat")
def chat(req: ChatRequest):

    print(f"[CHAT] Received: user_id={req.user_id}, session_id={req.session_id}, persona={req.persona}")

    # Validate required fields
    if not req.user_id or not req.session_id:
        print(f"[CHAT] ERROR: Missing user_id or session_id!")
        return {"response": "Something went wrong. Please refresh and try again."}

    # Crisis check first
    if is_crisis(req.message):
        return {
            "response": "I'm really sorry you're feeling this way. Please reach out to someone you trust or a professional. You are not alone."
        }

    db = SessionLocal()
    try:
        # 1. Save user message (tied to session)
        user_msg = Chat(
            user_id=req.user_id,
            session_id=req.session_id,
            role="user",
            message=req.message,
            persona=req.persona,
        )
        db.add(user_msg)
        db.commit()
        print(f"[CHAT] Saved user msg id={user_msg.id} to session={req.session_id}")

        # 2. LLM-powered memory extraction (runs in background-style)
        existing_mem = load_memory_text(db, req.user_id)
        try:
            extraction = extract_memory_llm(req.message, existing_mem)
            if extraction.get("facts") or extraction.get("mood"):
                save_extracted_memory(db, req.user_id, extraction)
                print(f"[CHAT] Saved LLM-extracted memory: {len(extraction.get('facts', []))} facts")
        except Exception as e:
            print(f"[CHAT] Memory extraction failed (non-blocking): {e}")

        # 3. Auto-summarize any unsummarized past sessions
        try:
            maybe_summarize_previous_sessions(db, req.user_id, req.session_id)
        except Exception as e:
            print(f"[CHAT] Session summarization failed (non-blocking): {e}")

        # 4. SESSION context window — current session's messages
        session_history = (
            db.query(Chat)
            .filter(Chat.session_id == req.session_id)
            .order_by(Chat.id.desc())
            .limit(20)
            .all()
        )

        # 5. Build rich personalized context
        personalized_context = build_personalized_context(
            db, req.user_id, req.session_id, req.message
        )

        # 6. Build Groq messages list
        messages = []

        messages.append({
            "role": "system",
            "content": get_persona_prompt(req.persona),
        })

        # Inject personalized context (memory + summaries + mood)
        if personalized_context:
            messages.append({
                "role": "system",
                "content": personalized_context,
            })

        # Session context (oldest → newest)
        for msg in reversed(session_history):
            messages.append({
                "role":    msg.role,
                "content": msg.message,
            })

        # 7. Call Groq API
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "model":       GROQ_MODEL,
                "messages":    messages,
                "temperature": 0.6,
                "max_tokens":  400,
            },
        )

        data = response.json()
        if "choices" not in data:
            reply = f"Groq API Error: {data}"
        else:
            reply = data["choices"][0]["message"]["content"]

        # 8. Save AI reply
        ai_msg = Chat(
            user_id=req.user_id,
            session_id=req.session_id,
            role="assistant",
            message=reply,
            persona=req.persona,
        )
        db.add(ai_msg)
        db.commit()
        print(f"[CHAT] Saved AI msg id={ai_msg.id} to session={req.session_id}")

        # 9. Auto-update session title after first real message
        if req.session_id:
            session_obj = db.query(Session).filter(Session.id == req.session_id).first()
            if session_obj and session_obj.title == "New Chat":
                session_obj.title = req.message[:50].strip()
                db.commit()

    except Exception as e:
        db.rollback()
        reply = f"Server Error: {str(e)}"
    finally:
        db.close()

    return {"response": reply}


# ─── Memory Dashboard Endpoints ──────────────────────────────

@app.get("/memory/{user_id}")
def get_memories(user_id: str):
    """Get all memories for a user, grouped by category."""
    db = SessionLocal()
    try:
        memories = (
            db.query(Memory)
            .filter(Memory.user_id == user_id)
            .order_by(Memory.importance.desc())
            .all()
        )
        grouped = {}
        for m in memories:
            cat = m.category or "personal"
            grouped.setdefault(cat, []).append({
                "id": m.id,
                "key": m.key,
                "value": m.value,
                "importance": m.importance,
                "created_at": m.created_at,
                "updated_at": m.updated_at,
            })
        return {"user_id": user_id, "memories": grouped}
    finally:
        db.close()


@app.delete("/memory/{memory_id}")
def delete_memory(memory_id: int):
    """Delete a specific memory by ID."""
    db = SessionLocal()
    try:
        db.query(Memory).filter(Memory.id == memory_id).delete()
        db.commit()
        return {"ok": True}
    finally:
        db.close()


@app.get("/memory/{user_id}/mood-timeline")
def get_mood_timeline(user_id: str, limit: int = 30):
    """Get mood history for visualization."""
    db = SessionLocal()
    try:
        moods = (
            db.query(MoodEntry)
            .filter(MoodEntry.user_id == user_id)
            .order_by(MoodEntry.id.desc())
            .limit(limit)
            .all()
        )
        return {
            "user_id": user_id,
            "moods": [
                {
                    "id": m.id,
                    "mood": m.mood,
                    "intensity": m.intensity,
                    "context": m.context,
                    "created_at": m.created_at,
                }
                for m in reversed(moods)  # oldest first for timeline
            ],
        }
    finally:
        db.close()


@app.get("/memory/{user_id}/summary")
def get_user_profile_summary(user_id: str):
    """Get a combined profile summary — memories + mood trend + recent topics."""
    db = SessionLocal()
    try:
        # Memories
        memories = db.query(Memory).filter(Memory.user_id == user_id).all()
        mem_count = len(memories)

        # Mood trend
        moods = (
            db.query(MoodEntry)
            .filter(MoodEntry.user_id == user_id)
            .order_by(MoodEntry.id.desc())
            .limit(10)
            .all()
        )
        dominant_mood = None
        if moods:
            mood_counts = {}
            for m in moods:
                mood_counts[m.mood] = mood_counts.get(m.mood, 0) + 1
            dominant_mood = max(mood_counts, key=mood_counts.get)

        # Recent topics from summaries
        summaries = (
            db.query(ConversationSummary)
            .filter(ConversationSummary.user_id == user_id)
            .order_by(ConversationSummary.id.desc())
            .limit(5)
            .all()
        )
        all_topics = []
        for s in summaries:
            if s.topics:
                all_topics.extend(s.topics.split(","))
        unique_topics = list(dict.fromkeys(t.strip() for t in all_topics if t.strip()))[:10]

        return {
            "user_id": user_id,
            "memory_count": mem_count,
            "dominant_mood": dominant_mood,
            "recent_topics": unique_topics,
            "summaries_count": len(summaries),
        }
    finally:
        db.close()