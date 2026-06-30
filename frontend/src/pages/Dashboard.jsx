import { Card } from "../components/ui.jsx";
import Wings from "../components/Wings.jsx";

// Phase 1: the home screen looks like the locked design using placeholder
// numbers. Phase 3 wires these to the real Bills & Income data.
export default function Dashboard() {
  return (
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Safe to spend this month</p>
        <p
          className="mono glow-violet"
          style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-1px", color: "var(--violet)", margin: "8px 0 0" }}
        >
          $0
        </p>
        <div style={{ marginTop: 16, height: 8, background: "var(--track)", borderRadius: 99, overflow: "hidden", display: "flex" }}>
          <div style={{ width: "0%", background: "var(--violet)" }} />
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
          Add your income and bills to see this come alive.
        </p>
      </Card>

      <div style={{ display: "flex", gap: 12 }}>
        <Card style={{ flex: 1, padding: "14px 16px", borderRadius: 18 }}>
          <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>Bills this week</p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 500, margin: "6px 0 0" }}>0</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>$0 due</p>
        </Card>
        <Card accent="green" style={{ flex: 1, padding: "14px 16px", borderRadius: 18 }}>
          <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>Portfolio today</p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 500, margin: "6px 0 0", color: "var(--green)" }}>--</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>No holdings yet</p>
        </Card>
      </div>

      <div
        style={{
          background: "var(--hcard-bg)",
          border: "1px solid var(--hcard-bd)",
          borderRadius: 20,
          padding: "16px 18px",
          boxShadow: "0 0 22px var(--violet-glow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--violet)" }}>
          <Wings size={24} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--hname)", fontFamily: "var(--font-display)" }}>
            Hermie
          </span>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--htext)" }}>
          Hi, I'm Hermie. Once you add your income and a few bills, I'll help you understand your
          money and explain what the numbers mean.
        </p>
        <p style={{ fontSize: 11, color: "var(--hdisc)", marginTop: 10 }}>Educational, not financial advice</p>
      </div>
    </div>
  );
}
