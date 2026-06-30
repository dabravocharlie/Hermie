import Wings from "./Wings.jsx";

// Phase 1: the panel opens and shows Hermie's intro. Phase 6 wires the real
// conversation, web access, and cross-module reading.
export default function HermiePanel({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Hermie"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        background: "rgba(10,10,25,0.45)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          height: "82vh",
          background: "var(--bg)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: "1px solid var(--hcard-bd)",
          boxShadow: "0 -8px 40px var(--violet-glow)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 18px",
            borderBottom: "1px solid var(--divider)",
            color: "var(--violet)",
          }}
        >
          <Wings size={26} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--hname)", flex: 1 }}>
            Hermie
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 22 }}
          >
            {"\u00D7"}
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
          <div
            style={{
              background: "var(--hcard-bg)",
              border: "1px solid var(--hcard-bd)",
              borderRadius: 16,
              padding: "14px 16px",
              color: "var(--htext)",
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            Hi, I'm Hermie. I'll help you make sense of your money: explaining your cash flow,
            walking through what the numbers mean, and keeping notes for you. I'm an educational
            guide, not a financial advisor.
            <p style={{ fontSize: 12, color: "var(--hdisc)", marginTop: 10 }}>
              I come fully online in a later build step.
            </p>
          </div>
        </div>

        <div style={{ padding: 14, borderTop: "1px solid var(--divider)" }}>
          <input
            disabled
            placeholder="Ask Hermie anything about your money"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1px solid var(--divider)",
              background: "var(--card)",
              color: "var(--ink)",
              padding: "0 14px",
              fontSize: 14,
            }}
          />
        </div>
      </div>
    </div>
  );
}
