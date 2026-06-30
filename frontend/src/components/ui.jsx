// Small shared building blocks so every page looks consistent.

export function Card({ children, accent = "violet", style }) {
  const bd = accent === "green" ? "var(--green-soft)" : "var(--card-bd)";
  const glow = accent === "green" ? "var(--green-soft)" : "var(--violet-glow)";
  return (
    <div
      style={{
        background: "var(--card)",
        border: `1px solid ${bd}`,
        borderRadius: 20,
        padding: 20,
        boxShadow: `0 0 22px ${glow}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Empty states are invitations, not apologies.
export function EmptyState({ title, body, icon }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        color: "var(--ink-soft)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          margin: "0 auto 16px",
          background: "var(--hcard-bg)",
          border: "1px solid var(--hcard-bd)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          color: "var(--violet)",
        }}
      >
        {icon}
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>
        {title}
      </p>
      <p style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 280, margin: "0 auto" }}>{body}</p>
    </div>
  );
}
