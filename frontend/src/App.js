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

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

function PersonaScreen({ onSelect }) {
  return (
    <div className="screen" id="persona-screen">
      <div className="persona-screen-inner">
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
        <div className="msg-time">{msg.time}</div>
      </div>
    </div>
  );
}

function ChatScreen({ persona, onBack }) {
  const info = PERSONAS[persona];
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const textAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Send initial greeting once on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([{ role: "ai", text: info.greeting, time: now() }]);
    }, 450);
    return () => clearTimeout(timer);
  }, [info.greeting]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const triggerToast = useCallback((msg) => {
    setToastMsg(msg);
    setShowToast(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 4000);
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

    setMessages((prev) => [...prev, { role: "user", text, time: now() }]);
    setIsTyping(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, persona }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setIsTyping(false);

      if (isCrisis(data.response)) {
        setMessages((prev) => [
          ...prev,
          { type: "crisis", text: data.response, time: now() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: data.response, time: now() },
        ]);
      }
    } catch (err) {
      setIsTyping(false);
      triggerToast("⚠️ Could not reach Saathi backend. Make sure it's running on port 8000.");
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "I'm having trouble connecting right now. Please check your connection and try again.",
          time: now(),
        },
      ]);
      console.error(err);
    }

    setIsSending(false);
    textAreaRef.current?.focus();
  }, [input, isSending, persona, triggerToast]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isSending) sendMessage();
    }
  };

  const canSend = input.trim() !== "" && !isSending;

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
                <span>Active · here for you</span>
              </div>
            </div>
          </div>
          <button className="header-menu" title="Options" aria-label="Menu">⋯</button>
        </div>

        {/* Messages */}
        <div className="messages-area" id="messages-area">
          {messages.length === 0 && (
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
              placeholder="Type a message…"
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
  const [persona, setPersona] = useState(null);

  const handleSelect = (p) => setPersona(p);
  const handleBack = () => setPersona(null);

  return (
    <div className="app">
      <BgOrbs />

      {!persona ? (
        <PersonaScreen onSelect={handleSelect} />
      ) : (
        <ChatScreen key={persona} persona={persona} onBack={handleBack} />
      )}
    </div>
  );
}
