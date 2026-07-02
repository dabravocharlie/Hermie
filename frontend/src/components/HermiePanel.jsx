import { useEffect, useRef, useState } from "react";
import { useApi } from "../lib/api.js";
import Wings from "./Wings.jsx";

export default function HermiePanel({ open, onClose }) {
  const api = useApi();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && !loaded) {
      (async () => {
        try {
          const hist = await api.get("/api/hermie/history");
          setMessages(hist || []);
        } catch {
          setMessages([]);
        } finally {
          setLoaded(true);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await api.post("/api/hermie/chat", { message: text });
      setMessages((p) => [...p, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((p) => [...p, { role: "assistant", content: "I hit a snag reaching my brain. If the app was idle it may be waking up \u2014 try once more in a moment." }]);
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Hermie"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", justifyContent: "center", alignItems: "flex-end", background: "rgba(10,10,25,0.45)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, height: "85vh", background: "var(--bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTop: "1px solid var(--hcard-bd)", boxShadow: "0 -8px 40px var(--violet-glow)", display: "flex", flexDirection: "column" }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid var(--divider)", color: "var(--violet)" }}>
          <Wings size={26} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--hname)", flex: 1 }}>Hermie</span>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 22 }}>{"\u00D7"}</button>
        </header>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {loaded && !messages.length && (
            <div style={{ background: "var(--hcard-bg)", border: "1px solid var(--hcard-bd)", borderRadius: 16, padding: "14px 16px", color: "var(--htext)", fontSize: 15, lineHeight: 1.55 }}>
              Hi, I'm Hermie. Ask me about your money \u2014 how your month looks, what a term means, or the latest on something you own. I can also jot notes, add to your watchlist, or set reminders. I'm an educational guide, not a financial advisor.
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "82%", background: "var(--violet)", color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", fontSize: 15, lineHeight: 1.5 }}>{m.content}</div>
            ) : (
              <div key={i} style={{ alignSelf: "flex-start", maxWidth: "88%", background: "var(--hcard-bg)", border: "1px solid var(--hcard-bd)", color: "var(--htext)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: 15, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m.content}</div>
            )
          )}
          {sending && (
            <div style={{ alignSelf: "flex-start", color: "var(--hdisc)", fontSize: 14, padding: "4px 6px" }}>Hermie is thinking...</div>
          )}
        </div>

        <form onSubmit={send} style={{ padding: 12, borderTop: "1px solid var(--divider)", display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Hermie anything about your money"
            style={{ flex: 1, height: 46, borderRadius: 12, border: "1px solid var(--divider)", background: "var(--card)", color: "var(--ink)", padding: "0 14px", fontSize: 15 }}
          />
          <button type="submit" disabled={sending} aria-label="Send" style={{ width: 46, height: 46, borderRadius: 12, border: "none", background: "var(--violet)", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2191"}</button>
        </form>
        <p style={{ fontSize: 10, color: "var(--hdisc)", textAlign: "center", padding: "0 0 10px" }}>Educational, not financial advice</p>
      </div>
    </div>
  );
}
