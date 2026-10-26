import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ImageOff, MessageCircle, Send } from "lucide-react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getSocket } from "../utils/socket";
import { formatPrice, initials } from "../utils/format";

const timeOf = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Chat() {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(location.state?.conversationId || null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const messagesRef = useRef(null);
  const socketRef = useRef(null);
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    API.get("/chat/conversations")
      .then((res) => setConversations(res.data.conversations || []))
      .catch(() => toast.error("Couldn't load your conversations"))
      .finally(() => setLoadingList(false));
  }, []);

  // One socket for the lifetime of this page, authenticated by the same cookie as the REST API.
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onMessage = (msg) => {
      if (msg.conversation === activeIdRef.current) setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === msg.conversation);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], lastMessagePreview: msg.text, lastMessageAt: msg.createdAt };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
    };
    // Rooms are lost on reconnect, so join the open conversation again.
    const onConnect = () => activeIdRef.current && socket.emit("join-conversation", activeIdRef.current);

    socket.on("new-message", onMessage);
    socket.on("connect", onConnect);
    socket.connect();
    return () => {
      socket.off("new-message", onMessage);
      socket.off("connect", onConnect);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const socket = socketRef.current;
    setMessages([]);
    socket.emit("join-conversation", activeId);
    API.get(`/chat/conversations/${activeId}/messages`)
      .then((res) => setMessages(res.data.messages || []))
      .catch(() => toast.error("Couldn't load this conversation"));
    return () => socket.emit("leave-conversation", activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;
    socketRef.current.emit("send-message", { conversationId: activeId, text }, (ack) => {
      if (!ack?.ok) toast.error(ack?.error || "Failed to send message");
    });
    setDraft("");
  };

  const other = (c) => (c.buyer?._id === user.id ? c.seller : c.buyer);
  const active = conversations.find((c) => c._id === activeId);
  const activeOther = active ? other(active) : null;

  const thumb = (c) =>
    c.listing?.thumbnail ? <img src={c.listing.thumbnail} alt="" /> : <span className="thumb-ph"><ImageOff size={18} /></span>;

  return (
    <>
      <div className="page-title">
        <h1>Messages</h1>
      </div>
      <div className={`chat-shell${activeId ? " has-active" : ""}`}>
        <div className="chat-list">
          <div className="chat-list-head">Conversations</div>
          {loadingList ? (
            <div className="page-loader"><span className="spinner" /></div>
          ) : conversations.length === 0 ? (
            <p className="muted small" style={{ padding: 16 }}>No conversations yet. Open an ad and press “Chat with seller” to start one.</p>
          ) : (
            conversations.map((c) => (
              <button key={c._id} className={`chat-item${c._id === activeId ? " active" : ""}`} onClick={() => setActiveId(c._id)}>
                {thumb(c)}
                <div className="meta">
                  <div className="name">{other(c)?.name || "User"}</div>
                  <div className="sub">{c.listing?.title}</div>
                  <div className="sub">{c.lastMessagePreview || "No messages yet"}</div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="chat-thread">
          {!activeId ? (
            <div className="chat-empty">
              <MessageCircle size={40} style={{ opacity: 0.4 }} />
              <p>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              <div className="chat-head">
                <button className="icon-btn chat-back" onClick={() => setActiveId(null)} aria-label="Back to conversations">
                  <ArrowLeft size={18} />
                </button>
                <span className="avatar">{initials(activeOther?.name)}</span>
                <div className="meta">
                  <strong>{activeOther?.name || "User"}</strong>
                  <span className="small muted">
                    {active?.listing?.title} {active?.listing?.price !== undefined && `· ${formatPrice(active.listing.price)}`}
                  </span>
                </div>
              </div>
              <div className="chat-messages" ref={messagesRef}>
                {messages.length === 0 && <div className="chat-empty">Say hello 👋</div>}
                {messages.map((m) => {
                  const mine = (m.sender?._id || m.sender) === user.id;
                  return (
                    <div key={m._id} className={`bubble ${mine ? "mine" : "theirs"}`}>
                      {m.text}
                      <time>{timeOf(m.createdAt)}</time>
                    </div>
                  );
                })}
              </div>
              <form className="chat-compose" onSubmit={handleSend}>
                <input className="input" placeholder="Type a message…" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} aria-label="Message" />
                <button type="submit" className="btn" disabled={!draft.trim()}>
                  <Send size={16} /> <span className="btn-label">Send</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
