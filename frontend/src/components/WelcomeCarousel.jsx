import { useEffect, useState } from "react";
import Wings from "./Wings.jsx";

const CARDS = [
  { icon: "wings", title: "Meet Hermie", body: "Your personal money guide. I help you understand your finances in plain language \u2014 no jargon, no pressure." },
  { icon: "\u{1F9FE}", title: "Add your income & bills", body: "Start in the Bills tab. Once your money in and out is there, your home screen shows what's safe to spend." },
  { icon: "wings", title: "Ask me anything", body: "Tap the glowing wings on any screen to chat. Ask what a term means, how your month looks, or have me set a reminder." },
  { icon: "\u{1F4CA}", title: "See it all at a glance", body: "Track your portfolio, watchlist, and upcoming bills and paydays \u2014 all in one place with countdowns." },
  { icon: "\u2139\uFE0F", title: "One important note", body: "Hermie is an educational tool, not a financial advisor. I explain things and your own numbers, but I won't tell you what to buy or sell." },
];

export default function WelcomeCarousel({ open, onFinish }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;
  const card = CARDS[step];
  const last = step === CARDS.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flex: 1, justifyContent: "center", gap: 20 }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--hcard-bg)", border: "1px solid var(--hcard-bd)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--violet)", boxShadow: "0 0 30px var(--violet-soft)", fontSize: 44 }}>
          {card.icon === "wings" ? <Wings size={56} /> : <span>{card.icon}</span>}
        </div>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>{card.title}</h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 320 }}>{card.body}</p>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 18, paddingBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 7 }}>
          {CARDS.map((_, i) => (
            <span key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 99, background: i === step ? "var(--violet)" : "var(--divider)", transition: "width 0.2s" }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} style={{ flex: 1, height: 50, borderRadius: 14, border: "1px solid var(--divider)", background: "transparent", color: "var(--ink-soft)", fontSize: 16, fontWeight: 500 }}>Back</button>
          )}
          <button
            onClick={() => (last ? onFinish() : setStep((s) => s + 1))}
            style={{ flex: 2, height: 50, borderRadius: 14, border: "none", background: "var(--violet)", color: "#fff", fontSize: 16, fontWeight: 500, boxShadow: "0 0 20px var(--violet-soft)" }}
          >
            {last ? "Get started" : "Next"}
          </button>
        </div>

        {!last && (
          <button onClick={onFinish} style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 14 }}>Skip</button>
        )}
      </div>
    </div>
  );
}
