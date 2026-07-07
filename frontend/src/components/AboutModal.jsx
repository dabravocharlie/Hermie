import Wings from "./Wings.jsx";

export default function AboutModal({ open, onClose, onReplay }) {
  if (!open) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const openDoc = (path) => window.open(`${origin}${path}`, "_blank");

  return (
    <div
      role="dialog"
      aria-label="About Hermie"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,10,25,0.45)", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 360, background: "var(--card)", border: "1px solid var(--hcard-bd)", borderRadius: 20, padding: 22, boxShadow: "0 0 30px var(--violet-soft)" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--hcard-bg)", border: "1px solid var(--hcard-bd)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--violet)", boxShadow: "0 0 18px var(--violet-soft)" }}>
            <Wings size={34} />
          </div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>Hermie</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>Your money, made clear.</p>
        </div>

        <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55, marginTop: 16, textAlign: "center" }}>
          Hermie is an educational tool that helps you understand your money. It is not a financial
          advisor and does not tell you what to buy, sell, or hold.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          <button onClick={() => openDoc("/privacy.html")} style={{ height: 44, borderRadius: 12, border: "1px solid var(--divider)", background: "transparent", color: "var(--violet)", fontSize: 15, fontWeight: 500 }}>Privacy Policy</button>
          <button onClick={() => openDoc("/terms.html")} style={{ height: 44, borderRadius: 12, border: "1px solid var(--divider)", background: "transparent", color: "var(--violet)", fontSize: 15, fontWeight: 500 }}>Terms of Use</button>
          {onReplay && (
            <button onClick={onReplay} style={{ height: 44, borderRadius: 12, border: "1px solid var(--divider)", background: "transparent", color: "var(--violet)", fontSize: 15, fontWeight: 500 }}>Replay tutorial</button>
          )}
          <button onClick={onClose} style={{ height: 44, borderRadius: 12, border: "none", background: "var(--violet)", color: "#fff", fontSize: 15, fontWeight: 500 }}>Close</button>
        </div>
      </div>
    </div>
  );
}
