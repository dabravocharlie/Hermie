import { useState, useEffect } from "react";
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from "@clerk/clerk-react";
import { useApi } from "./lib/api.js";
import { useTheme, ThemeToggle } from "./components/ThemeToggle.jsx";
import TabBar from "./components/TabBar.jsx";
import HermieButton from "./components/HermieButton.jsx";
import HermiePanel from "./components/HermiePanel.jsx";
import AboutModal from "./components/AboutModal.jsx";
import WelcomeCarousel from "./components/WelcomeCarousel.jsx";
import Wings from "./components/Wings.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Bills from "./pages/Bills.jsx";
import Portfolio from "./pages/Portfolio.jsx";
import Research from "./pages/Research.jsx";
import Calendar from "./pages/Calendar.jsx";

const PAGES = {
  home: Dashboard,
  bills: Bills,
  portfolio: Portfolio,
  research: Research,
  calendar: Calendar,
};

const TITLES = {
  bills: "Bills & income",
  portfolio: "Portfolio",
  research: "Research",
  calendar: "Calendar",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <>
      <SignedOut>
        <SignInScreen theme={theme} onToggle={toggle} />
      </SignedOut>
      <SignedIn>
        <MainApp theme={theme} onToggle={toggle} />
      </SignedIn>
    </>
  );
}

function SignInScreen({ theme, onToggle }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 24,
      }}
    >
      <div style={{ position: "absolute", top: 18, right: 18 }}>
        <ThemeToggle theme={theme} onToggle={onToggle} />
      </div>
      <div style={{ textAlign: "center", color: "var(--violet)" }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            margin: "0 auto 14px",
            background: "var(--hcard-bg)",
            border: "1px solid var(--hcard-bd)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 26px var(--violet-soft)",
          }}
        >
          <Wings size={42} />
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "var(--ink)" }}>
          Hermie
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 4 }}>
          Your money, made clear.
        </p>
      </div>
      <SignIn appearance={{ variables: { colorPrimary: "#6E2EF5" } }} />
    </div>
  );
}

function MainApp({ theme, onToggle }) {
  const { user } = useUser();
  const api = useApi();
  const [tab, setTab] = useState("home");
  const [hermieOpen, setHermieOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const Page = PAGES[tab];

  // First-login check: show the tutorial if this account hasn't seen it.
  useEffect(() => {
    (async () => {
      try {
        const p = await api.get("/api/profile");
        if (p && !p.tutorialSeen) setShowTutorial(true);
      } catch {
        /* on error, don't interrupt the user; they'll see it next load */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishTutorial() {
    setShowTutorial(false);
    api.post("/api/profile/tutorial-seen").catch(() => {});
  }
  function replayTutorial() {
    setAboutOpen(false);
    setShowTutorial(true);
  }

  return (
    <div className="app-shell">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 16px 12px",
        }}
      >
        <div>
          {tab === "home" ? (
            <>
              <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>{greeting()}</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>
                {user?.firstName || "there"}
              </p>
            </>
          ) : (
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>
              {TITLES[tab]}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setAboutOpen(true)}
            aria-label="About and legal"
            style={{ width: 36, height: 36, borderRadius: "50%", background: "transparent", border: "1px solid var(--divider)", color: "var(--ink-soft)", fontSize: 15, fontWeight: 600 }}
          >
            {"\u2139"}
          </button>
          <ThemeToggle theme={theme} onToggle={onToggle} />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Page />
      </main>

      <HermieButton onClick={() => setHermieOpen(true)} />
      <HermiePanel open={hermieOpen} onClose={() => setHermieOpen(false)} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} onReplay={replayTutorial} />
      <WelcomeCarousel open={showTutorial} onFinish={finishTutorial} />
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
