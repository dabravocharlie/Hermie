import { useEffect, useState } from "react";

const STORAGE_KEY = "hermie_theme";

// Reads saved theme, applies it to <html>, exposes a toggle.
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY);
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#06070F" : "#F7F8FD"
    );
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage may be unavailable; ignore */
    }
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

export function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "transparent",
        border: "1px solid var(--divider)",
        color: "var(--ink-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 17,
      }}
    >
      {theme === "dark" ? "\u2600" : "\u263E"}
    </button>
  );
}
