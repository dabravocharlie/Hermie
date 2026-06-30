// Minimal inline icons so we don't pull in an icon-font dependency.
function Icon({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M9.5 20v-6h5v6" />
        </svg>
      );
    case "bills":
      return (
        <svg {...common}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
          <path d="M9 8h6M9 12h6" />
        </svg>
      );
    case "portfolio":
      return (
        <svg {...common}>
          <path d="M4 19V5M20 19H4" />
          <path d="M7 15l3-4 3 2 4-6" />
        </svg>
      );
    case "research":
      return (
        <svg {...common}>
          <path d="M6 4h12v16l-6-3-6 3z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M4 9h16M8 3v4M16 3v4" />
        </svg>
      );
    default:
      return null;
  }
}

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "bills", label: "Bills", icon: "bills" },
  { id: "portfolio", label: "Portfolio", icon: "portfolio" },
  { id: "research", label: "Research", icon: "research" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 460,
        display: "flex",
        justifyContent: "space-around",
        padding: "12px 8px calc(14px + env(safe-area-inset-bottom))",
        background: "var(--nav-bg)",
        borderTop: "1px solid var(--divider)",
        zIndex: 20,
      }}
    >
      {TABS.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-label={t.label}
            aria-current={on ? "page" : undefined}
            style={{
              background: "transparent",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: on ? "var(--violet)" : "var(--nav-off)",
              filter: on ? "drop-shadow(0 0 5px var(--violet-soft))" : "none",
            }}
          >
            <Icon name={t.icon} />
            <span style={{ fontSize: 10, fontWeight: on ? 500 : 400 }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
