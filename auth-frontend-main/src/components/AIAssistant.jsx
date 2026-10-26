import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImageOff, RotateCcw, Send, Sparkles, X } from "lucide-react";
import API from "../utils/api";
import { filtersToQuery, formatPrice } from "../utils/format";

const GREETING = {
  role: "assistant",
  text: "Hi! I'm your shopping assistant. Tell me what you're looking for, or ask how things work.",
};
const SUGGESTIONS = [
  "Find a used bike under ₹10,000",
  "Show phones in Mumbai, cheapest first",
  "How do I sell something?",
  "Is it safe to pay in advance?",
];

// Floating assistant pinned to the bottom-right corner, available on every marketplace page.
export default function AIAssistant({ hidden = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const lastFilters = useRef(null); // lets the assistant understand follow-ups like "cheaper ones?"
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const reset = () => {
    setMessages([GREETING]);
    lastFilters.current = null;
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;

    const history = messages.filter((m) => !m.error).slice(-6).map(({ role, text }) => ({ role, text }));
    setMessages((m) => [...m, { role: "user", text: content }]);
    setInput("");
    setBusy(true);
    try {
      const { data } = await API.post("/ai/assistant", { message: content, history, lastFilters: lastFilters.current });
      if (data.intent === "search") lastFilters.current = data.filters;
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.reply, listings: data.listings, total: data.total, filters: data.intent === "search" ? data.filters : null },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", error: true, text: err.response?.data?.message || "Sorry, I couldn't reach the assistant right now." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const closeOnMobile = () => window.innerWidth < 720 && setOpen(false);

  const seeAll = (filters) => {
    navigate(`/listings?${filtersToQuery(filters)}`);
    closeOnMobile();
  };

  if (hidden) return null;

  if (!open) {
    return (
      <button className="ai-fab" onClick={() => setOpen(true)} aria-label="Open AI assistant">
        <Sparkles size={22} />
        <span className="btn-label">Ask AI</span>
      </button>
    );
  }

  const showSuggestions = messages.length === 1;

  return (
    <section className="ai-panel" role="dialog" aria-label="AI shopping assistant">
      <header className="ai-head">
        <span className="ai-avatar">
          <Sparkles size={18} />
        </span>
        <div style={{ flex: 1 }}>
          <strong>AI Assistant</strong>
          <span>Find ads, get selling &amp; safety help</span>
        </div>
        <button className="icon-btn" onClick={reset} aria-label="Start a new chat" title="New chat">
          <RotateCcw size={16} />
        </button>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close assistant">
          <X size={18} />
        </button>
      </header>

      <div className="ai-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div className={`ai-msg ${m.role === "user" ? "user" : "bot"}${m.error ? " error" : ""}`}>{m.text}</div>
            {m.listings?.length > 0 && (
              <div className="ai-results">
                {m.listings.slice(0, 4).map((l) => (
                  <Link key={l._id} to={`/listings/${l._id}`} className="ai-mini" onClick={closeOnMobile}>
                    {l.thumbnail ? (
                      <img src={l.thumbnail} alt="" />
                    ) : (
                      <span className="thumb-ph">
                        <ImageOff size={18} />
                      </span>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div className="t">{l.title}</div>
                      <div className="p">{formatPrice(l.price, l.currency)}</div>
                      <div className="c">{[l.city, l.category].filter(Boolean).join(" · ")}</div>
                    </div>
                  </Link>
                ))}
                {m.total > 0 && m.filters && (
                  <button className="btn btn-outline btn-sm" onClick={() => seeAll(m.filters)}>
                    See all {m.total} result{m.total === 1 ? "" : "s"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {showSuggestions && (
          <div className="ai-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="ai-chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {busy && (
          <div className="ai-msg bot" aria-label="Assistant is typing">
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>

      <form
        className="ai-compose"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input ref={inputRef} className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything…" maxLength={500} aria-label="Message" />
        <button type="submit" className="btn" disabled={busy || !input.trim()} aria-label="Send">
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}
