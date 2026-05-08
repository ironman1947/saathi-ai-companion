"""
Saathi AI — Memory Engine
LLM-powered memory extraction, context building, and conversation summarization.
"""

import json
import requests
import os
from datetime import datetime
from models import Memory, MoodEntry, ConversationSummary, Chat

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ─── LLM Helper ──────────────────────────────────────────────

def _call_groq(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str:
    """Lightweight Groq call for extraction tasks."""
    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.1,
                "max_tokens": max_tokens,
            },
            timeout=10,
        )
        data = resp.json()
        if "choices" in data:
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"[MemoryEngine] Groq call failed: {e}")
    return ""


# ─── LLM-Powered Memory Extraction ──────────────────────────

EXTRACTION_PROMPT = """You are a memory extraction system for an emotional AI companion.
Analyze the user's message and extract structured facts.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "facts": [
    {"category": "personal|relationship|preference|emotional|goal|context", "key": "short_label", "value": "extracted_value", "importance": 1-10}
  ],
  "mood": {"mood": "happy|sad|anxious|angry|neutral|excited|lonely|stressed|hopeful|confused", "intensity": 1-10, "context": "brief reason"},
  "topics": ["topic1", "topic2"]
}

Rules:
- Only extract facts that are CLEARLY stated or strongly implied
- If nothing notable, return {"facts": [], "mood": {"mood": "neutral", "intensity": 5, "context": ""}, "topics": []}
- Category guide: personal=name/age/location/job, relationship=people in their life, preference=likes/dislikes/hobbies, emotional=recurring feelings, goal=aspirations/plans, context=current situation
- Keep keys short (2-3 words max), values concise
- Importance: 8-10 for core identity, 5-7 for useful context, 1-4 for minor details"""


def extract_memory_llm(user_message: str, existing_memory_text: str) -> dict:
    """Use LLM to extract structured facts, mood, and topics from a user message."""
    context = ""
    if existing_memory_text:
        context = f"\n\nAlready known about this user:\n{existing_memory_text}"

    user_prompt = f"User message: \"{user_message}\"{context}"

    raw = _call_groq(EXTRACTION_PROMPT, user_prompt, max_tokens=400)
    if not raw:
        return {"facts": [], "mood": None, "topics": []}

    # Parse JSON from response (handle markdown code blocks)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print(f"[MemoryEngine] Failed to parse extraction JSON: {raw[:200]}")
        return {"facts": [], "mood": None, "topics": []}


# ─── Memory Save / Load ─────────────────────────────────────

def save_extracted_memory(db, user_id: str, extraction: dict):
    """Save extracted facts and mood to database."""
    now = datetime.utcnow().isoformat()

    # Save facts
    for fact in extraction.get("facts", []):
        category = fact.get("category", "personal")
        key = fact.get("key", "")
        value = fact.get("value", "")
        importance = fact.get("importance", 5)

        if not key or not value:
            continue

        # Upsert: update if same user+category+key exists
        existing = (
            db.query(Memory)
            .filter(Memory.user_id == user_id, Memory.key == key)
            .first()
        )
        if existing:
            existing.value = value
            existing.category = category
            existing.importance = max(existing.importance or 0, importance)
            existing.updated_at = now
        else:
            db.add(Memory(
                user_id=user_id, category=category, key=key,
                value=value, importance=importance,
                created_at=now, updated_at=now,
            ))

    # Save mood
    mood_data = extraction.get("mood")
    if mood_data and mood_data.get("mood") and mood_data["mood"] != "neutral":
        db.add(MoodEntry(
            user_id=user_id,
            mood=mood_data["mood"],
            intensity=mood_data.get("intensity", 5),
            context=mood_data.get("context", ""),
            created_at=now,
        ))

    db.commit()


def load_memory_text(db, user_id: str) -> str:
    """Load all stored facts formatted for prompt injection."""
    stored = (
        db.query(Memory)
        .filter(Memory.user_id == user_id)
        .order_by(Memory.importance.desc())
        .all()
    )
    if not stored:
        return ""

    # Group by category
    groups = {}
    for m in stored:
        cat = m.category or "personal"
        groups.setdefault(cat, []).append(m)

    lines = []
    cat_labels = {
        "personal": "🧑 Personal",
        "relationship": "👥 Relationships",
        "preference": "💜 Preferences",
        "emotional": "💭 Emotional Patterns",
        "goal": "🎯 Goals",
        "context": "📌 Current Context",
    }
    for cat, label in cat_labels.items():
        items = groups.get(cat, [])
        if items:
            lines.append(f"{label}:")
            for m in items:
                lines.append(f"  - {m.key}: {m.value}")

    return "\n".join(lines)


# ─── Conversation Summarization ──────────────────────────────

SUMMARY_PROMPT = """You are a conversation summarizer for an emotional AI companion.
Summarize the conversation in 2-3 sentences focusing on:
1. What the user talked about (topics, concerns)
2. Their emotional state throughout
3. Any important facts or decisions mentioned

Also extract:
- dominant_mood: the overall mood (one word)
- topics: list of 2-4 topic keywords

Return ONLY valid JSON:
{"summary": "...", "dominant_mood": "...", "topics": ["...", "..."]}"""


def summarize_session(db, user_id: str, session_id: int) -> dict:
    """Generate and store a summary for a session."""
    # Check if summary already exists
    existing = (
        db.query(ConversationSummary)
        .filter(ConversationSummary.session_id == session_id)
        .first()
    )
    if existing:
        return {"summary": existing.summary, "mood": existing.mood, "topics": existing.topics}

    # Get all messages from this session
    messages = (
        db.query(Chat)
        .filter(Chat.session_id == session_id)
        .order_by(Chat.id.asc())
        .all()
    )
    if len(messages) < 4:  # Don't summarize very short sessions
        return None

    # Build conversation text
    convo_text = "\n".join([
        f"{'User' if m.role == 'user' else 'AI'}: {m.message}"
        for m in messages[-30:]  # Last 30 messages max
    ])

    raw = _call_groq(SUMMARY_PROMPT, convo_text, max_tokens=300)
    if not raw:
        return None

    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        return None

    # Store summary
    summary_obj = ConversationSummary(
        user_id=user_id,
        session_id=session_id,
        summary=result.get("summary", ""),
        mood=result.get("dominant_mood", ""),
        topics=",".join(result.get("topics", [])),
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(summary_obj)
    db.commit()

    return result


# ─── Context Builder ────────────────────────────────────────

def build_personalized_context(db, user_id: str, current_session_id: int) -> str:
    """Build rich personalized context from memory, summaries, and mood history."""
    sections = []

    # 1. User memory
    memory_text = load_memory_text(db, user_id)
    if memory_text:
        sections.append(
            f"[MEMORY — What you know about this person]\n{memory_text}"
        )

    # 2. Recent conversation summaries (from OTHER sessions, not current)
    summaries = (
        db.query(ConversationSummary)
        .filter(
            ConversationSummary.user_id == user_id,
            ConversationSummary.session_id != current_session_id,
        )
        .order_by(ConversationSummary.id.desc())
        .limit(5)
        .all()
    )
    if summaries:
        summary_lines = []
        for s in summaries:
            mood_tag = f" (mood: {s.mood})" if s.mood else ""
            summary_lines.append(f"- {s.summary}{mood_tag}")
        sections.append(
            "[RECENT CONVERSATIONS — What happened before]\n"
            + "\n".join(summary_lines)
        )

    # 3. Mood trend
    moods = (
        db.query(MoodEntry)
        .filter(MoodEntry.user_id == user_id)
        .order_by(MoodEntry.id.desc())
        .limit(7)
        .all()
    )
    if moods:
        mood_strs = [f"{m.mood}({m.intensity}/10)" for m in moods]
        dominant = max(set(m.mood for m in moods), key=lambda x: sum(1 for m in moods if m.mood == x))
        sections.append(
            f"[MOOD TREND]\n"
            f"- Recent moods: {', '.join(mood_strs)}\n"
            f"- Dominant pattern: {dominant}"
        )

    if not sections:
        return ""

    return (
        "IMPORTANT — Use this context naturally. Never repeat it back robotically. "
        "Weave it into conversation as a friend who genuinely remembers.\n\n"
        + "\n\n".join(sections)
    )


# ─── Auto-Summarize Check ───────────────────────────────────

def maybe_summarize_previous_sessions(db, user_id: str, current_session_id: int):
    """Summarize any past sessions that don't have summaries yet."""
    from models import Session as SessionModel
    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.user_id == user_id,
            SessionModel.id != current_session_id,
        )
        .order_by(SessionModel.id.desc())
        .limit(5)
        .all()
    )
    for session in sessions:
        existing = (
            db.query(ConversationSummary)
            .filter(ConversationSummary.session_id == session.id)
            .first()
        )
        if not existing:
            try:
                summarize_session(db, user_id, session.id)
            except Exception as e:
                print(f"[MemoryEngine] Failed to summarize session {session.id}: {e}")
