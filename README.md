# Saathi AI Companion 🧠💬

> AI-powered emotional reflection companion with persona-based interaction, contextual memory, and natural conversational flow.

![Status](https://img.shields.io/badge/Status-MVP%20Complete-brightgreen)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![LLM](https://img.shields.io/badge/LLM-Groq%20%7C%20Llama%203.1-purple)
![DB](https://img.shields.io/badge/Memory-SQLite-blue)

---

## 🌟 What is Saathi?

**Saathi** (Hindi: साथी — meaning *companion*) is an AI-powered emotional reflection system that gives users a safe, private space to express their thoughts and feelings.

Instead of generic chatbot replies, Saathi uses **persona-based interaction** and **contextual memory** to respond in a grounded, empathetic, and human-like way.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🎭 **Persona Engine** | Three distinct conversation modes — Supportive Friend, Wise Guide, Reality Anchor |
| 🧠 **Short-Term Memory** | Remembers the last 15 messages for contextual, connected responses |
| 📌 **Memory Anchors** | Extracts and pins key facts (e.g. user's name) so they survive context window shifts |
| 🛡️ **Safety Layer** | Detects crisis language and responds with care + redirects to professional help |
| ⚡ **Fast & Lightweight** | Built on Groq (Llama 3.1 8B Instant) — responses in under 2 seconds |
| 🌐 **REST API** | Clean FastAPI backend with `/chat` and `/history` endpoints |

---

## 🎭 Personas

| Persona | Tone | Best for |
|---|---|---|
| 💜 **Supportive Friend** | Warm, empathetic, emotionally intelligent | Processing feelings, feeling heard |
| 🌊 **Wise Guide** | Calm, reflective, philosophical | Finding clarity, deeper thinking |
| ⚡ **Reality Anchor** | Practical, structured, direct | Actionable advice, cutting through noise |

---

## 🏗️ Tech Stack

```
Backend   →  FastAPI + Python
LLM       →  Groq API (Llama 3.1 8B Instant)
Memory    →  SQLite + SQLAlchemy ORM
Frontend  →  HTML + Vanilla CSS + JavaScript (no framework)
```

---

## 📁 Project Structure

```
saathi-ai-companion/
│
├── backend/
│   ├── main.py          # FastAPI app, routes, memory logic
│   ├── database.py      # SQLAlchemy engine + session setup
│   ├── models.py        # Chat ORM model (chats table)
│   ├── requirements.txt # Python dependencies
│   └── .env             # API keys (not committed — see .env.example)
│
├── frontend/
│   └── index.html       # Single-page UI (Persona Selector + Chat)
│
├── .env.example         # Template for required environment variables
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/saathi-ai-companion.git
cd saathi-ai-companion
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp ../.env.example .env
# Edit .env and add your GROQ_API_KEY
```

Get a free API key at [console.groq.com](https://console.groq.com)

### 4. Run the backend

```bash
uvicorn main:app --reload --port 8000
```

### 5. Open the frontend

Open `frontend/index.html` in your browser. That's it — no build step needed.

---

## 📡 API Reference

### `POST /chat`

Send a message and receive a context-aware response.

```json
{
  "message": "I feel really overwhelmed",
  "persona": "supportive_friend",
  "user_id": "user1"
}
```

**Persona options:** `supportive_friend` · `wise_guide` · `reality_anchor`

**Response:**
```json
{
  "response": "It sounds like you're carrying a lot right now..."
}
```

### `GET /history/{user_id}`

Retrieve stored conversation history for a user.

```
GET /history/user1?limit=20
```

---

## 🧠 How Memory Works

```
User message
    ↓
1. Save to SQLite
2. Fetch last 15 turns from DB
3. Extract memory anchors (name, key facts)
4. Build: [system prompt] + [persona] + [anchors] + [history]
5. Send to Groq → get response
6. Save AI reply to SQLite
    ↓
Return response
```

---

## 🗺️ Roadmap

- [x] Persona-based conversation engine
- [x] Short-term SQLite memory (last 15 messages)
- [x] Memory anchors (name extraction + pinning)
- [x] Safety layer for crisis detection
- [x] Clean frontend UI
- [ ] 🔵 Vector memory (FAISS — store important facts only)
- [ ] 🟣 Emotion tracking (mood patterns over time)
- [ ] 🟡 Journaling mode (deep reflection sessions)
- [ ] 📊 Weekly emotional insights dashboard
- [ ] 🔐 User authentication (dynamic user IDs)

---

## 🎯 Vision

To build an intelligent emotional companion that helps people **reflect, understand, and grow** — without creating dependency or replacing human connection.

---

## 📌 Status

**MVP Complete** — Backend + Frontend + Memory fully working.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Built with 💜 — Saathi: always here, always listening.*
