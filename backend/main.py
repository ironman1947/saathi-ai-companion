from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

from database import engine, Base, SessionLocal
from models import Chat

load_dotenv()

# ---------- Create DB tables on startup ----------
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Saathi AI", description="Emotional Reflection Companion API")

# Allow all origins so the frontend can talk to the backend
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


class ChatRequest(BaseModel):
    message: str
    persona: str = "supportive_friend"
    user_id: str = "user1"  # default; will be dynamic later


# ---------- Persona Engine ----------
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
"""
    }

    return personas.get(persona, personas["supportive_friend"])


# ---------- Safety Layer ----------
def is_crisis(message):
    keywords = ["suicide", "kill myself", "want to die", "self harm"]
    return any(word in message.lower() for word in keywords)


# ---------- Routes ----------
@app.get("/")
def home():
    return {"message": "Saathi AI backend is running ✅ (with memory)"}


@app.post("/chat")
def chat(req: ChatRequest):

    # ---- Crisis check first ----
    if is_crisis(req.message):
        return {
            "response": "I'm really sorry you're feeling this way. Please reach out to someone you trust or a professional. You are not alone."
        }

    db = SessionLocal()

    try:
        # 1️⃣ Save user message to DB
        user_msg = Chat(
            user_id=req.user_id,
            role="user",
            message=req.message,
            persona=req.persona
        )
        db.add(user_msg)
        db.commit()

        # 2️⃣ Fetch last 15 messages for this user (most recent first)
        history = db.query(Chat).filter(
            Chat.user_id == req.user_id
        ).order_by(Chat.id.desc()).limit(15).all()

        # 3️⃣ Extract memory anchors from full history
        # --- Name anchor: scan all messages for "my name is ..."
        user_name = None
        for msg in reversed(history):  # oldest → newest scan
            lower = msg.message.lower()
            if "my name is" in lower:
                # grab the word(s) after "is"
                after = msg.message.split("is")[-1].strip().rstrip(".!?,")
                if after:
                    user_name = after
                    break

        # 4️⃣ Build message list for Groq
        messages = []

        messages.append({
            "role": "system",
            "content": """You are a grounded, realistic human companion here to listen and reflect.

STRICT RULES:
- NEVER mention that you are an AI, a bot, or an assistant. Act completely human.
- Respond based on the conversation context.
- Directly reference the user's exact emotions.
- Reflect the specific feelings mentioned.
- Give natural, everyday human replies — speak like a caring friend, not a therapist.
- Be grounded and realistic.
- Encourage thoughtful growth.
- REMEMBER key facts the user has shared (name, feelings, events). Never say you don't know something if it was mentioned earlier.
- Never forget what the user told you earlier in the conversation."""
        })

        persona_style = get_persona_style(req.persona)
        messages.append({
            "role": "system",
            "content": f"Persona Instructions:\n{persona_style}"
        })

        # Memory anchor: pin user's name so it survives window shifts
        if user_name:
            messages.append({
                "role": "system",
                "content": f"IMPORTANT: The user's name is {user_name}. Always use it naturally in conversation."
            })

        # Add conversation history (oldest → newest)
        for msg in reversed(history):
            messages.append({
                "role": msg.role,   # "user" or "assistant"
                "content": msg.message
            })

        # 4️⃣ Call Groq API
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": messages,
                "temperature": 0.6,
                "max_tokens": 400
            }
        )

        data = response.json()

        if "choices" not in data:
            reply = f"Groq API Error: {data}"
        else:
            reply = data["choices"][0]["message"]["content"]

        # 5️⃣ Save AI response to DB
        ai_msg = Chat(
            user_id=req.user_id,
            role="assistant",
            message=reply,
            persona=req.persona
        )
        db.add(ai_msg)
        db.commit()

    except Exception as e:
        db.rollback()
        reply = f"Server Error: {str(e)}"

    finally:
        db.close()

    return {"response": reply}


# ---------- History endpoint (bonus) ----------
@app.get("/history/{user_id}")
def get_history(user_id: str, limit: int = 20):
    db = SessionLocal()
    try:
        history = db.query(Chat).filter(
            Chat.user_id == user_id
        ).order_by(Chat.id.asc()).limit(limit).all()

        return {
            "user_id": user_id,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "message": m.message,
                    "persona": m.persona
                }
                for m in history
            ]
        }
    finally:
        db.close()