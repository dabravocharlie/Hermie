import Wings from "./Wings.jsx";

// The always-reachable Hermie launcher. A full-width centered wrapper matches
// the app column, and the button right-aligns inside it above the tab bar.
export default function HermieButton({ onClick }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 460,
        height: 0,
        zIndex: 25,
        pointerEvents: "none",
      }}
    >
      <button
        onClick={onClick}
        aria-label="Open Hermie"
        style={{
          position: "absolute",
          right: 16,
          bottom: "calc(96px + env(safe-area-inset-bottom))",
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: "var(--violet)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 0 22px var(--violet-soft), 0 6px 16px rgba(0,0,0,0.18)",
          pointerEvents: "auto",
        }}
      >
        <Wings size={30} glow={false} color="#fff" />
      </button>
    </div>
  );
}
