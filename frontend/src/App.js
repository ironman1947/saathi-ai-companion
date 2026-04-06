import React, { useState, useRef, useEffect, useCallback } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "./firebase";
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

// ─── LOGIN SCREEN ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user);
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled. Please try again.");
      } else {
        setError("Couldn't sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen" id="login-screen">
      <div className="onboarding-card">
        <div className="onboarding-glow" />
        <div className="hero-badge" style={{ marginBottom: "32px" }}>
          <span className="dot" /> Emotional AI Companion
        </div>
        <div className="onboarding-icon">🌸</div>
        <h1 className="onboarding-title">Welcome to Saathi</h1>
        <p className="onboarding-subtitle">
          Sign in to keep your conversations private and synced across all your devices.
        </p>

        <button
          id="google-login-btn"
          className={`google-login-btn ${loading ? "loading" : ""}`}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loader" />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {error && <div className="name-error" style={{ marginTop: "12px" }}>{error}</div>}

        <p className="onboarding-note">
          Your data is tied to your Google account — safe, private, and synced everywhere.
        </p>
      </div>
    </div>
  );
}

// ─── PERSONA SCREEN ───────────────────────────────────────────
function PersonaScreen({ userName, userPhoto, onSelect, onLogout }) {
  return (
    <div className="screen" id="persona-screen">
      <div className="persona-screen-inner">
        <div className="persona-topbar">
          <div className="user-greeting">
            {userPhoto ? (
              <img src={userPhoto} alt={userName} className="user-avatar-photo" />
            ) : (
              <span className="user-avatar">{userName.charAt(0).toUpperCase()}</span>
            )}
            Hey, <strong>{userName.split(" ")[0]}</strong> 👋
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
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
function Sidebar({ sessions, currentSessionId, onSelectSession, onNewChat, onDeleteSession, persona, userName, userPhoto, isLoading }) {
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
          <div
            key={s.id}
            className={`session-item ${s.id === currentSessionId ? "active" : ""}`}
            onClick={() => onSelectSession(s)}
            title={s.title}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") onSelectSession(s); }}
          >
            <div className="session-item-icon">{info.icon}</div>
            <div className="session-item-body">
              <div className="session-item-title">{s.title || "New Chat"}</div>
              <div className="session-item-time">{formatDate(s.created_at)}</div>
            </div>
            {s.id === currentSessionId && <div className="session-active-dot" />}
            <button
              className="session-delete-btn"
              title="Delete chat"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(s.id);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          {userPhoto ? (
            <img src={userPhoto} alt={userName} className="sidebar-user-avatar-photo" />
          ) : (
            <span className="sidebar-user-avatar">{userName.charAt(0).toUpperCase()}</span>
          )}
          <span className="sidebar-user-name">{userName.split(" ")[0]}</span>
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
function ChatScreen({ persona, userName, userPhoto, userId, onBack }) {
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
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

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

  // ── Retry-aware fetch (handles Render cold starts) ──
  const fetchWithRetry = useCallback(async (url, options = {}, retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn(`Fetch attempt ${attempt + 1}/${retries} failed for ${url}:`, err.message);
        if (attempt < retries - 1) {
          // Wait longer each retry: 2s, 4s — gives Render time to wake
          await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
        } else {
          throw err;
        }
      }
    }
  }, []);

  const createSession = useCallback(async () => {
    const res = await fetch(`${BACKEND_URL}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, persona }),
    });
    if (!res.ok) throw new Error("Could not create session");
    return await res.json();
  }, [userId, persona]);

  const loadSessionMessages = useCallback(async (session, cancelled = false) => {
    setMessagesLoading(true);
    try {
      const data = await fetchWithRetry(`${BACKEND_URL}/session-history/${session.id}`);
      console.log("[Saathi Debug] Session", session.id, "messages loaded:", data.messages.length);
      if (cancelled) return;
      if (data.messages.length === 0) {
        console.log("[Saathi Debug] No messages in session, showing greeting");
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
    } catch (err) {
      console.error("Failed to load session messages:", err);
      if (!cancelled) {
        triggerToast("⚠️ Could not load chat history. Try refreshing.");
        setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
      }
    } finally {
      if (!cancelled) setMessagesLoading(false);
    }
  }, [fetchWithRetry, info.greeting, triggerToast]);

  // ── Load sessions on mount ──
  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      console.log("[Saathi Debug] Loading sessions for userId:", userId, "persona:", persona);
      setSessionsLoading(true);
      try {
        const data = await fetchWithRetry(
          `${BACKEND_URL}/sessions/${encodeURIComponent(userId)}?persona=${persona}`
        );
        if (cancelled) return;
        console.log("[Saathi Debug] Sessions found:", data.sessions.length, data.sessions);
        setSessions(data.sessions);

        if (data.sessions.length > 0) {
          // Load the most recent session's messages
          console.log("[Saathi Debug] Loading messages for session:", data.sessions[0].id, data.sessions[0].title);
          await loadSessionMessages(data.sessions[0], cancelled);
          if (!cancelled) setCurrentSession(data.sessions[0]);
        } else {
          // No sessions yet — check if there are legacy (pre-session) messages
          try {
            const legacy = await fetchWithRetry(
              `${BACKEND_URL}/history/${encodeURIComponent(userId)}?limit=50`
            );
            if (!cancelled && legacy.messages && legacy.messages.length > 0) {
              // Migrate: create session and show old messages
              const newSession = await createSession();
              if (cancelled) return;
              setSessions([newSession]);
              setCurrentSession(newSession);
              setMessages(
                legacy.messages.map((m) => ({
                  role: m.role === "assistant" ? "ai" : "user",
                  text: m.message,
                  time: null,
                  fromHistory: true,
                }))
              );
              return;  // skip the greeting since we have history
            }
          } catch {
            // Legacy endpoint failed — that's fine, just start fresh
          }

          // Truly new user — create first session with greeting
          const newSession = await createSession();
          if (cancelled) return;
          setSessions([newSession]);
          setCurrentSession(newSession);
          setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
        }
      } catch (err) {
        // All retries exhausted — show error state instead of silently losing history
        console.error("Failed to load sessions after retries:", err);
        if (!cancelled) {
          triggerToast("⚠️ Backend is waking up… please wait a moment and refresh.");
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }
    loadSessions();
    return () => { cancelled = true; };
  }, [persona, userId, fetchWithRetry, triggerToast, createSession, loadSessionMessages, info.greeting]);

  const handleSelectSession = useCallback(async (session) => {
    setCurrentSession(session);
    await loadSessionMessages(session);
    // Close sidebar on mobile after selecting a session
    if (window.innerWidth <= 768) setSidebarOpen(false);
  }, [loadSessionMessages]);

  const handleNewChat = useCallback(async () => {
    try {
      const newSession = await createSession();
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
    } catch {
      triggerToast("⚠️ Could not create new chat. Try again.");
    }
  }, [createSession, info.greeting, triggerToast]);

  const handleDeleteSession = useCallback(async (sessionId) => {
    if (!window.confirm("Delete this chat? This cannot be undone.")) return;
    try {
      await fetch(`${BACKEND_URL}/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      triggerToast("🗑️ Chat deleted.");
    } catch {
      triggerToast("⚠️ Could not delete chat. Try again.");
    }
  }, [currentSession, triggerToast]);

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
          user_id:    userId,
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
  }, [input, isSending, currentSession, persona, userId, triggerToast]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) sendMessage(); }
  };

  const canSend = input.trim() !== "" && !isSending && !!currentSession;

  return (
    <div className="screen" id="chat-screen">
      <div className="chat-layout">

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`sidebar-wrap ${sidebarOpen ? "open" : "closed"}`}>
          <Sidebar
            sessions={sessions}
            currentSessionId={currentSession?.id}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            persona={persona}
            userName={userName}
            userPhoto={userPhoto}
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
                  <span>Chatting as <strong>{userName.split(" ")[0]}</strong></span>
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
  // null = loading, false = logged out, object = Firebase user
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [persona, setPersona] = useState(null);

  // Persist auth state across page refreshes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("[Saathi Debug] Auth state changed:", user ? `UID=${user.uid}, Name=${user.displayName}` : "logged out");
      setFirebaseUser(user || false);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = (user) => {
    setFirebaseUser(user);
    setPersona(null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setFirebaseUser(false);
    setPersona(null);
  };

  // ─── Render loading spinner while Firebase resolves auth ───
  if (authLoading) {
    return (
      <div className="app">
        <BgOrbs />
        <div className="auth-loading">
          <span className="btn-loader" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      </div>
    );
  }

  const userId   = firebaseUser ? firebaseUser.uid : null;
  const userName = firebaseUser ? (firebaseUser.displayName || "Friend") : null;
  const userPhoto = firebaseUser ? firebaseUser.photoURL : null;

  return (
    <div className="app">
      <BgOrbs />
      {!firebaseUser ? (
        <LoginScreen onLogin={handleLogin} />
      ) : !persona ? (
        <PersonaScreen
          userName={userName}
          userPhoto={userPhoto}
          onSelect={(p) => setPersona(p)}
          onLogout={handleLogout}
        />
      ) : (
        <ChatScreen
          key={`${userId}-${persona}`}
          persona={persona}
          userName={userName}
          userPhoto={userPhoto}
          userId={userId}
          onBack={() => setPersona(null)}
        />
      )}
    </div>
  );
}
