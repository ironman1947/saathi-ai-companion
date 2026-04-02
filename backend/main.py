from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import requests
import os
from dotenv import load_dotenv
from datetime import datetime

from database import engine, Base, SessionLocal
from models import Chat, Session

load_dotenv()

# ---------- Create tables + migrate existing DB ----------
Base.metadata.create_all(bind=engine)

# SQLite migration: add session_id column to chats if it doesn't exist yet
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE chats ADD COLUMN session_id INTEGER"))
        conn.commit()
    except Exception:
        pass  # Column already exists — safe to ignore

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


# ─── Persona Engine ────────────────────────────────────────────
def get_persona_style(persona):
    personas = {
        "supportive_friend": """
Tone: Warm, emotionally intelligent, grounded.
Encourage growth.
Avoid emotional dependency.
""",
        "wise_guide": """
Tone: Calm, reflective, philosophical.
Ask thoughtful questions.
Encourage clarity.
""",
        "reality_anchor": """
Tone: Practical, structured, direct.
Provide actionable advice.
Avoid emotional exaggeration.
""",
    }
    return personas.get(persona, personas["supportive_friend"])


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

        # 2. SESSION context window — only this session's messages
        if req.session_id:
            session_history = (
                db.query(Chat)
                .filter(Chat.session_id == req.session_id)
                .order_by(Chat.id.desc())
                .limit(20)
                .all()
            )
        else:
            # Fallback for old clients without session_id
            session_history = (
                db.query(Chat)
                .filter(Chat.user_id == req.user_id)
                .order_by(Chat.id.desc())
                .limit(15)
                .all()
            )

        # 3. GLOBAL memory — scan ALL user messages for name anchor
        all_user_msgs = (
            db.query(Chat)
            .filter(Chat.user_id == req.user_id, Chat.role == "user")
            .order_by(Chat.id.asc())
            .all()
        )

        user_name = None
        for msg in all_user_msgs:
            lower = msg.message.lower()
            if "my name is" in lower:
                after = msg.message.split("is")[-1].strip().rstrip(".!?,")
                if after:
                    user_name = after
                    break

        # 4. Build Groq messages list
        messages = []

        messages.append({
                    "role": "system",
                    "content": """You are a grounded, realistic human companion here to listen and reflect.

        STRICT RULES:
        - NEVER mention that you are an AI, a bot, or an assistant. Act completely human.
        - USE EMOJIS, NOT ROLEPLAY: Never use text action tags like (laughs), *smiles*, or *sighs*. Instead, use natural emojis (like 😂, 😊, 🫂) to show emotion, just like a real person texting.
        - ROLL WITH THE PUNCHES: If the user teases or jokes, go along with it casually. Do not get defensive or write paragraphs explaining boundaries.
        - Respond based on the conversation context.
        - Directly reference the user's exact emotions.
        - Reflect the specific feelings mentioned.
        - Give generic, everyday human replies (speak naturally, like a normal person talking to a friend).
        - Be grounded and realistic.
        - Encourage thoughtful growth.
        - REMEMBER key facts the user has shared (name, context, earlier statements).
        - Keep responses concise and conversational. Avoid long, repetitive paragraphs.""",
                })

        messages.append({
            "role": "system",
            "content": f"Persona Instructions:\n{get_persona_style(req.persona)}",
        })

        # Global memory anchor
        if user_name:
            messages.append({
                "role": "system",
                "content": f"IMPORTANT: The user's name is {user_name}. Always use it naturally in conversation.",
            })

        # Session context (oldest → newest)
        for msg in reversed(session_history):
            messages.append({
                "role":    msg.role,
                "content": msg.message,
            })

        # 5. Call Groq API
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "model":       "llama-3.1-8b-instant",
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

        # 6. Save AI reply
        ai_msg = Chat(
            user_id=req.user_id,
            session_id=req.session_id,
            role="assistant",
            message=reply,
            persona=req.persona,
        )
        db.add(ai_msg)
        db.commit()

        # 7. Auto-update session title after first real message
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