import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

// ─── Constants ────────────────────────────────────────────────
const BACKEND_URL = "https://saathi-ai-companion-e0x0.onrender.com";

const PERSONAS = {
  supportive_friend: {
    name: "Supportive Friend",
    icon: "💜",
    tag: "Emotional",
    desc: "Warm, empathetic, and emotionally intelligent. Here to listen without judgment and help you feel understood.",
    welcomeTitle: "Here with you",
    welcomeDesc: "Open up whenever you're ready — no rush at all.",
    greeting: "I'm here to listen, without judgment. What's going on?",
  },
  wise_guide: {
    name: "Wise Guide",
    icon: "🌊",
    tag: "Reflective",
    desc: "Calm, reflective, and philosophical. Asks thoughtful questions that help you find your own clarity.",
    welcomeTitle: "Space to reflect",
    welcomeDesc: "Take a breath. Let's find some clarity together.",
    greeting: "What brings you here today? Let's explore it together.",
  },
  reality_anchor: {
    name: "Reality Anchor",
    icon: "⚡",
    tag: "Practical",
    desc: "Practical, structured, and direct. Cuts through the noise and gives you clear, actionable next steps.",
    welcomeTitle: "Let's get focused",
    welcomeDesc: "Give me the situation — we'll work through it pragmatically.",
    greeting: "Tell me what's going on. We'll figure out a clear path forward.",
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
  try {
    return localStorage.getItem("saathi_user_name") || null;
  } catch {
    return null;
  }
}

function storeUser(name) {
  try {
    localStorage.setItem("saathi_user_name", name);
  } catch {}
}

function clearStoredUser() {
  try {
    localStorage.removeItem("saathi_user_name");
  } catch {}
}

// ─── Sub-components ───────────────────────────────────────────

function BgOrbs() {
  return (
    <div className="bg-orbs">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}

// ─── ONBOARDING SCREEN ────────────────────────────────────────
function OnboardingScreen({ onComplete }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name to continue.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setLoading(true);
    storeUser(trimmed);
    setTimeout(() => onComplete(trimmed), 400);
  };

  return (
    <div className="screen" id="onboarding-screen">
      <div className="onboarding-card">
        <div className="onboarding-glow" />

        <div className="hero-badge" style={{ marginBottom: "32px" }}>
          <span className="dot" />
          Emotional AI Companion
        </div>

        <div className="onboarding-icon">🌸</div>

        <h1 className="onboarding-title">Welcome to Saathi</h1>
        <p className="onboarding-subtitle">
          Before we begin, what should I call you?
        </p>

        <form className="onboarding-form" onSubmit={handleSubmit} noValidate>
          <div className={`name-input-wrap ${error ? "has-error" : ""}`}>
            <input
              ref={inputRef}
              id="name-input"
              type="text"
              className="name-input"
              placeholder="Your first name…"
              value={name}
              maxLength={32}
              autoComplete="given-name"
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
            />
          </div>

          {error && <div className="name-error">{error}</div>}

          <button
            type="submit"
            id="onboarding-submit"
            className={`onboarding-btn ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loader" />
            ) : (
              <>
                Let's begin
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="onboarding-note">
          Your name is stored locally and never shared.
        </p>
      </div>
    </div>
  );
}

// ─── PERSONA SCREEN ───────────────────────────────────────────
function PersonaCard({ personaKey, info, onSelect }) {
  return (
    <div
      className={`persona-card ${personaKey}`}
      id={`card-${personaKey}`}
      tabIndex={0}
      role="button"
      aria-label={`Choose ${info.name}`}
      onClick={() => onSelect(personaKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(personaKey);
        }
      }}
    >
      <div className="card-arrow">→</div>
      <div className="card-content">
        <div className="persona-icon-wrap">{info.icon}</div>
        <div className="persona-name">{info.name}</div>
        <div className="persona-desc">{info.desc}</div>
        <span className="persona-tag">{info.tag}</span>
      </div>
    </div>
  );
}

function PersonaScreen({ userName, onSelect, onLogout }) {
  return (
    <div className="screen" id="persona-screen">
      <div className="persona-screen-inner">
        <div className="persona-topbar">
          <div className="user-greeting">
            <span className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span>
              Hey, <strong>{userName}</strong> 👋
            </span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Switch user">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Switch user
          </button>
        </div>

        <div className="hero-header">
          <div className="hero-badge">
            <span className="dot" />
            Emotional AI Companion
          </div>
          <h1 className="hero-title">
            Who do you want
            <br />
            to talk to?
          </h1>
          <p className="hero-subtitle">
            Choose a companion that feels right for what you're going through right now.
          </p>
        </div>

        <div className="personas-grid">
          {Object.entries(PERSONAS).map(([key, info]) => (
            <PersonaCard key={key} personaKey={key} info={info} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CHAT SCREEN ──────────────────────────────────────────────
function TypingIndicator({ icon }) {
  return (
    <div className="typing-indicator">
      <div className="msg-avatar ai">{icon}</div>
      <div className="typing-bubble">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

function MessageBubble({ msg, personaIcon }) {
  if (msg.type === "crisis") {
    return (
      <div className="crisis-banner">
        <span className="crisis-icon">🆘</span>
        <span>{msg.text}</span>
      </div>
    );
  }

  const isUser = msg.role === "user";
  return (
    <div className={`message-row ${isUser ? "user" : "ai"}`}>
      <div className={`msg-avatar ${isUser ? "user-av" : "ai"}`}>
        {isUser ? "🧑" : personaIcon}
      </div>
      <div className="bubble-wrap">
        <div className="message-bubble">{msg.text}</div>
        {msg.time && <div className="msg-time">{msg.time}</div>}
      </div>
    </div>
  );
}

function ChatScreen({ persona, userName, onBack }) {
  const info = PERSONAS[persona];
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const textAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`${BACKEND_URL}/history/${encodeURIComponent(userName)}?limit=30`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        // Filter to messages for this persona
        const personaMsgs = data.messages.filter((m) => m.persona === persona);

        if (personaMsgs.length > 0) {
          const formatted = personaMsgs.map((m) => ({
            role: m.role === "assistant" ? "ai" : "user",
            text: m.message,
            time: null, // no timestamp from DB for now
            fromHistory: true,
          }));
          setMessages(formatted);
        } else {
          // No history — show greeting
          setTimeout(() => {
            if (!cancelled) {
              setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
            }
          }, 300);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Could not load history:", err);
        // Fallback to greeting
        setTimeout(() => {
          if (!cancelled) {
            setMessages([{ role: "ai", text: info.greeting, time: nowTime() }]);
          }
        }, 300);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    }

    loadHistory();
    return () => { cancelled = true; };
  }, [persona, userName, info.greeting]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const triggerToast = useCallback((msg) => {
    setToastMsg(msg);
    setShowToast(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 4500);
  }, []);

  const handleInput = (e) => {
    setInput(e.target.value);
    const el = textAreaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

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
          user_id: userName,
          message: text,
          persona,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setIsTyping(false);

      if (isCrisis(data.response)) {
        setMessages((prev) => [
          ...prev,
          { type: "crisis", text: data.response, time: nowTime() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: data.response, time: nowTime() },
        ]);
      }
    } catch (err) {
      setIsTyping(false);
      triggerToast("⚠️ Could not reach Saathi backend. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "I'm having trouble connecting right now. Please check your connection and try again.",
          time: nowTime(),
        },
      ]);
      console.error(err);
    }

    setIsSending(false);
    textAreaRef.current?.focus();
  }, [input, isSending, persona, userName, triggerToast]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isSending) sendMessage();
    }
  };

  const canSend = input.trim() !== "" && !isSending;
  const showEmptyState = !isLoadingHistory && messages.length === 0;

  return (
    <div className="screen" id="chat-screen">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <button className="back-btn" onClick={onBack} title="Choose another persona" aria-label="Go back">
            ←
          </button>
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
          <button className="header-menu" title="Options" aria-label="Menu">⋯</button>
        </div>

        {/* Messages */}
        <div className="messages-area" id="messages-area">

          {/* History loading skeleton */}
          {isLoadingHistory && (
            <div className="history-loading">
              <div className="history-skeleton" />
              <div className="history-skeleton short" />
              <div className="history-skeleton" style={{ alignSelf: "flex-end" }} />
            </div>
          )}

          {/* History badge */}
          {!isLoadingHistory && messages.some((m) => m.fromHistory) && (
            <div className="history-badge">
              <span>💬 Continuing your previous conversation</span>
            </div>
          )}

          {/* Empty state */}
          {showEmptyState && (
            <div className="welcome-msg">
              <span className="welcome-icon">{info.icon}</span>
              <h3>{info.welcomeTitle}</h3>
              <p>{info.welcomeDesc}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} personaIcon={info.icon} />
          ))}

          {isTyping && <TypingIndicator icon={info.icon} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
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
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!canSend}
              aria-label="Send message"
              id="send-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div className="input-hint">Saathi AI · Beta · Your conversations stay private</div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${showToast ? "show" : ""}`}>{toastMsg}</div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  const [userName, setUserName] = useState(() => getStoredUser());
  const [persona, setPersona] = useState(null);

  const handleOnboardingComplete = (name) => setUserName(name);

  const handleLogout = () => {
    clearStoredUser();
    setUserName(null);
    setPersona(null);
  };

  const handleSelectPersona = (p) => setPersona(p);

  const handleBack = () => setPersona(null);

  return (
    <div className="app">
      <BgOrbs />

      {!userName ? (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      ) : !persona ? (
        <PersonaScreen
          userName={userName}
          onSelect={handleSelectPersona}
          onLogout={handleLogout}
        />
      ) : (
        <ChatScreen
          key={`${userName}-${persona}`}
          persona={persona}
          userName={userName}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
