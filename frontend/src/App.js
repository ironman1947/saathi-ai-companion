import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

// ─── Constants ────────────────────────────────────────────────
const BACKEND_URL = "https://saathi-ai-companion-e0x0.onrender.com";

const PERSONAS = {
  supportive_friend: {
    name: "Supportive Friend",
    icon: "💜",
    tag: "Emotional",
    desc: "Warm, empathetic, and emotionally intelligent. Here to listen without judgment.",
    greeting: "I'm here to listen, without judgment. What's going on?",
    color: "purple",
  },
  wise_guide: {
    name: "Wise Guide",
    icon: "🌊",
    tag: "Reflective",
    desc: "Calm, reflective, and philosophical. Thoughtful questions to find clarity.",
    greeting: "What brings you here today? Let's explore it together.",
    color: "cyan",
  },
  reality_anchor: {
    name: "Reality Anchor",
    icon: "⚡",
    tag: "Practical",
    desc: "Practical, structured, and direct. Clear, actionable next steps.",
    greeting: "Tell me what's going on. We'll figure out a clear path forward.",
    color: "amber",
  },
};

// ─── Helpers ──────────────────────────────────────────────────
function isCrisis(text) {
  return ["reach out to someone", "you are not alone", "professional"].some(
    (t) => text.toLowerCase().includes(t)
  );
}
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function getStoredUser() {
  try { return localStorage.getItem("saathi_user_name") || null; } catch { return null; }
}
function storeUser(name) {
  try { localStorage.setItem("saathi_user_name", name); } catch {}
}
function clearStoredUser() {
  try { localStorage.removeItem("saathi_user_name"); } catch {}
}
function formatDate(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr + "Z");
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return ""; }
}

// ─── BG Orbs ──────────────────────────────────────────────────
function BgOrbs() {
  return (
    <div className="bg-orbs">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────
function OnboardingScreen({ onComplete }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) { setError("Please enter at least 2 characters."); return; }
    setLoading(true);
    storeUser(trimmed);
    setTimeout(() => onComplete(trimmed), 400);
  };

  return (
    <div className="screen" id="onboarding-screen">
      <div className="onboarding-card">
        <div className="onboarding-glow" />
        <div className="hero-badge" style={{ marginBottom: "32px" }}>
          <span className="dot" /> Emotional AI Companion
        </div>
        <div className="onboarding-icon">🌸</div>
        <h1 className="onboarding-title">Welcome to Saathi</h1>
        <p className="onboarding-subtitle">Before we begin, what should I call you?</p>
        <form className="onboarding-form" onSubmit={handleSubmit} noValidate>
          <div className={`name-input-wrap ${error ? "has-error" : ""}`}>
            <input ref={inputRef} id="name-input" type="text" className="name-input"
              placeholder="Your first name…" value={name} maxLength={32}
              onChange={(e) => { setName(e.target.value); if (error) setError(""); }} />
          </div>
          {error && <div className="name-error">{error}</div>}
          <button type="submit" id="onboarding-submit"
            className={`onboarding-btn ${loading ? "loading" : ""}`} disabled={loading}>
            {loading ? <span className="btn-loader" /> : <>Let's begin <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>}
          </button>
        </form>
        <p className="onboarding-note">Your name is stored locally and never shared.</p>
      </div>
    </div>
  );
}

// ─── PERSONA SCREEN ───────────────────────────────────────────
function PersonaScreen({ userName, onSelect, onLogout }) {
  return (
    <div className="screen" id="persona-screen">
      <div className="persona-screen-inner">
        <div className="persona-topbar">
          <div className="user-greeting">
            <span className="user-avatar">{userName.charAt(0).toUpperCase()}</span>
            Hey, <strong>{userName}</strong> 👋
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Switch user
          </button>
        </div>
        <div className="hero-header">
          <div className="hero-badge"><span className="dot" /> Emotional AI Companion</div>
          <h1 className="hero-title">Who do you want<br/>to talk to?</h1>
          <p className="hero-subtitle">Choose a companion that feels right for what you're going through right now.</p>
        </div>
        <div className="personas-grid">
          {Object.entries(PERSONAS).map(([key, info]) => (
            <div key={key} className={`persona-card ${key}`} tabIndex={0} role="button"
              aria-label={`Choose ${info.name}`}
              onClick={() => onSelect(key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(key); }}}>
              <div className="card-arrow">→</div>
              <div className="card-content">
                <div className="persona-icon-wrap">{info.icon}</div>
                <div className="persona-name">{info.name}</div>
                <div className="persona-desc">{info.desc}</div>
                <span className="persona-tag">{info.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────
function Sidebar({ sessions, currentSessionId, onSelectSession, onNewChat, persona, userName, isLoading }) {
  const info = PERSONAS[persona];
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-persona-badge">
          <span>{info.icon}</span>
          <span>{info.name}</span>
        </div>
        <button className="new-chat-btn" onClick={onNewChat} id="new-chat-btn" title="Start a new chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div className="sidebar-label">Chat History</div>

      <div className="session-list">
        {isLoading && (
          <>
            <div className="session-skeleton" />
            <div className="session-skeleton short" />
            <div className="session-skeleton" />
          </>
        )}
        {!isLoading && sessions.length === 0 && (
          <div className="session-empty">No past chats yet</div>
        )}
        {!isLoading && sessions.map((s) => (
          <button
            key={s.id}
            className={`session-item ${s.id === currentSessionId ? "active" : ""}`}
            onClick={() => onSelectSession(s)}
            title={s.title}
          >
            <div className="session-item-icon">{info.icon}</div>
            <div className="session-item-body">
              <div className="session-item-title">{s.title || "New Chat"}</div>
              <div className="session-item-time">{formatDate(s.created_at)}</div>
            </div>
            {s.id === currentSessionId && <div className="session-active-dot" />}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="sidebar-user-avatar">{userName.charAt(0).toUpperCase()}</span>
          <span className="sidebar-user-name">{userName}</span>
        </div>
      </div>
    </div>
  );
}

// ─── MESSAGE COMPONENTS ───────────────────────────────────────
function TypingIndicator({ icon }) {
  return (
    <div className="typing-indicator">
      <div className="msg-avatar ai">{icon}</div>
      <div className="typing-bubble">
        <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
      </div>
    </div>
  );
}

function MessageBubble({ msg, personaIcon }) {
  if (msg.type === "crisis") {
    return (
      <div className="crisis-banner">
        <span className="crisis-icon">🆘</span><span>{msg.text}</span>
      </div>
    );
  }
  const isUser = msg.role === "user";
  return (
    <div className={`message-row ${isUser ? "user" : "ai"}`}>
      <div className={`msg-avatar ${isUser ? "user-av" : "ai"}`}>{isUser ? "🧑" : personaIcon}</div>
      <div className="bubble-wrap">
        <div className="message-bubble">{msg.text}</div>
        {msg.time && <div className="msg-time">{msg.time}</div>}
      </div>
    </div>
  );
}

// ─── CHAT SCREEN ──────────────────────────────────────────────
function ChatScreen({ persona, userName, onBack }) {
  const info = PERSONAS[persona];

  // Session state
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef(null);

  const textAreaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const triggerToast = useCallback((msg) => {
    setToastMsg(msg);
    setShowToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 4500);
  }, []);

  // ── Load sessions on mount ──
  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      setSessionsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/sessions/${encodeURIComponent(userName)}?persona=${persona}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        setSessions(data.sessions);

        if (data.sessions.length > 0) {
          // Resume most recent session
          await loadSessionMessages(data.sessions[0], cancelled);
          if (!cancelled) setCurrentSession(data.sessions[0]);
        } else {
          // Create first session
          const newSession = await createSession();
          if (cancelled) return;
          setSessions([newSession]);
          setCurrentSession(newSession);
          setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
        }
      } catch {
        if (cancelled) return;
        // Fallback: create a session
        try {
          const newSession = await createSession();
          if (!cancelled) {
            setSessions([newSession]);
            setCurrentSession(newSession);
            setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
          }
        } catch {}
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }
    loadSessions();
    return () => { cancelled = true; };
  }, [persona, userName]); // eslint-disable-line

  const createSession = async () => {
    const res = await fetch(`${BACKEND_URL}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userName, persona }),
    });
    if (!res.ok) throw new Error("Could not create session");
    return await res.json();
  };

  const loadSessionMessages = async (session, cancelled = false) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/session-history/${session.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (cancelled) return;
      if (data.messages.length === 0) {
        setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
      } else {
        setMessages(
          data.messages.map((m) => ({
            role: m.role === "assistant" ? "ai" : "user",
            text: m.message,
            time: null,
            fromHistory: true,
          }))
        );
      }
    } catch {
      if (!cancelled) setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
    } finally {
      if (!cancelled) setMessagesLoading(false);
    }
  };

  const handleSelectSession = useCallback(async (session) => {
    setCurrentSession(session);
    await loadSessionMessages(session);
  }, []); // eslint-disable-line

  const handleNewChat = useCallback(async () => {
    try {
      const newSession = await createSession();
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
    } catch {
      triggerToast("⚠️ Could not create new chat. Try again.");
    }
  }, [persona, userName, info.greeting, triggerToast]); // eslint-disable-line

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleInput = (e) => {
    setInput(e.target.value);
    const el = textAreaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending || !currentSession) return;

    setIsSending(true);
    setInput("");
    if (textAreaRef.current) textAreaRef.current.style.height = "auto";

    setMessages((prev) => [...prev, { role: "user", text, time: nowTime() }]);
    setIsTyping(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:    userName,
          session_id: currentSession.id,
          message:    text,
          persona,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIsTyping(false);

      if (isCrisis(data.response)) {
        setMessages((prev) => [...prev, { type: "crisis", text: data.response, time: nowTime() }]);
      } else {
        setMessages((prev) => [...prev, { role: "ai", text: data.response, time: nowTime() }]);
      }

      // Update session title in sidebar (backend does it, we just refresh the title locally)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSession.id && s.title === "New Chat"
            ? { ...s, title: text.slice(0, 50) }
            : s
        )
      );
      if (currentSession.title === "New Chat") {
        setCurrentSession((prev) => ({ ...prev, title: text.slice(0, 50) }));
      }

    } catch (err) {
      setIsTyping(false);
      triggerToast("⚠️ Could not reach Saathi backend. Please try again.");
      setMessages((prev) => [...prev, {
        role: "ai",
        text: "I'm having trouble connecting right now. Please check your connection.",
        time: nowTime(),
      }]);
    }

    setIsSending(false);
    textAreaRef.current?.focus();
  }, [input, isSending, currentSession, persona, userName, triggerToast]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) sendMessage(); }
  };

  const canSend = input.trim() !== "" && !isSending && !!currentSession;

  return (
    <div className="screen" id="chat-screen">
      <div className="chat-layout">

        {/* Sidebar */}
        <div className={`sidebar-wrap ${sidebarOpen ? "open" : "closed"}`}>
          <Sidebar
            sessions={sessions}
            currentSessionId={currentSession?.id}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            persona={persona}
            userName={userName}
            isLoading={sessionsLoading}
          />
        </div>

        {/* Chat panel */}
        <div className="chat-panel">
          <div className="chat-header">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle sidebar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            <button className="back-btn" onClick={onBack} title="Choose another persona">←</button>

            <div className="chat-persona-info">
              <div className={`chat-persona-avatar ${persona}`}>{info.icon}</div>
              <div>
                <div className="chat-persona-name">{info.name}</div>
                <div className="chat-persona-status">
                  <span className="status-dot" />
                  <span>Chatting as <strong>{userName}</strong></span>
                </div>
              </div>
            </div>

            <button className="header-menu" aria-label="Menu">⋯</button>
          </div>

          <div className="messages-area" id="messages-area">
            {messagesLoading && (
              <div className="history-loading">
                <div className="history-skeleton" />
                <div className="history-skeleton short" style={{ alignSelf: "flex-end" }} />
                <div className="history-skeleton" />
              </div>
            )}

            {!messagesLoading && messages.some((m) => m.fromHistory) && (
              <div className="history-badge">
                <span>💬 Continuing this conversation</span>
              </div>
            )}

            {!messagesLoading && messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} personaIcon={info.icon} />
            ))}

            {isTyping && <TypingIndicator icon={info.icon} />}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <div className="input-row">
              <textarea
                ref={textAreaRef}
                className="message-input"
                placeholder={`Message ${info.name}…`}
                rows={1}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                aria-label="Message input"
                id="message-input"
              />
              <button className="send-btn" onClick={sendMessage} disabled={!canSend}
                aria-label="Send message" id="send-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div className="input-hint">Saathi AI · Beta · Your conversations stay private</div>
          </div>
        </div>
      </div>

      <div className={`toast ${showToast ? "show" : ""}`}>{toastMsg}</div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  const [userName, setUserName] = useState(() => getStoredUser());
  const [persona, setPersona] = useState(null);

  return (
    <div className="app">
      <BgOrbs />
      {!userName ? (
        <OnboardingScreen onComplete={(name) => setUserName(name)} />
      ) : !persona ? (
        <PersonaScreen
          userName={userName}
          onSelect={(p) => setPersona(p)}
          onLogout={() => { clearStoredUser(); setUserName(null); setPersona(null); }}
        />
      ) : (
        <ChatScreen
          key={`${userName}-${persona}`}
          persona={persona}
          userName={userName}
          onBack={() => setPersona(null)}
        />
      )}
    </div>
  );
}
